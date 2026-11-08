"""manpage: browse local man pages in the browser.

    manpage                 open the dashboard (starting the server if needed)
    manpage NAME            open NAME's man page
    manpage SECTION NAME    open NAME from SECTION, e.g. `manpage 3 printf`
    manpage -- NAME         open NAME even if it is a subcommand (e.g. `-- stop`)
    manpage start | stop | restart | status
    manpage serve           run the server in the foreground

Environment: MANPAGE_HOST (default 127.0.0.1), MANPAGE_PORT (default 8642).
"""

from __future__ import annotations

import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
from urllib.parse import quote

from manpage import __version__, server

COMMANDS = ("start", "stop", "restart", "status", "serve")
SECTION_RE = re.compile(r"^(?:[0-9][A-Za-z0-9]*|n|l)$")
START_TIMEOUT = 60  # building the index runs `man -k .`, which can be slow


def base_url() -> str:
    host, port = server.address()
    if ":" in host:
        host = f"[{host}]"
    return f"http://{host}:{port}"


def log_path() -> Path:
    state = os.environ.get("XDG_STATE_HOME") or Path.home() / ".local" / "state"
    return Path(state) / "manpage" / "server.log"


def fetch(path: str, timeout: float = 2.0) -> tuple[int, dict | None]:
    """GET a JSON endpoint. Returns (status, body); status 0 if nothing is listening."""
    try:
        with urllib.request.urlopen(base_url() + path, timeout=timeout) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except ValueError:
            return e.code, None
    except (urllib.error.URLError, OSError, ValueError):
        return 0, None


def health() -> dict | None:
    """Our server's health info, None if nothing listens; raises if the port is foreign."""
    status, body = fetch("/api/health", timeout=1.0)
    if status == 0:
        return None
    if status == 200 and isinstance(body, dict) and body.get("app") == "manpage":
        return body
    raise SystemExit(
        f"manpage: {base_url()} is in use by another program; "
        "set MANPAGE_PORT to use a different port"
    )


def daemonize() -> None:
    """Fork the server into the background and wait until it is listening."""
    log = log_path()
    log.parent.mkdir(parents=True, exist_ok=True)
    read_fd, write_fd = os.pipe()

    pid = os.fork()
    if pid == 0:
        # First child: detach from the terminal, then fork again so the server
        # is not a session leader and gets reparented to init.
        os.close(read_fd)
        os.setsid()
        if os.fork() != 0:
            os._exit(0)
        run_daemon(write_fd, log)
        os._exit(0)

    os.close(write_fd)
    os.waitpid(pid, 0)
    with os.fdopen(read_fd) as status_pipe:
        # Blocks until the daemon reports ready/failed or exits (EOF).
        message = status_pipe.read()
    if message != "ok":
        detail = message.removeprefix("error: ") or f"server exited, see {log}"
        raise SystemExit(f"manpage: could not start server: {detail}")


def run_daemon(write_fd: int, log: Path) -> None:
    os.chdir("/")
    devnull = os.open(os.devnull, os.O_RDONLY)
    logfd = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    os.dup2(devnull, 0)
    os.dup2(logfd, 1)
    os.dup2(logfd, 2)
    os.close(devnull)
    os.close(logfd)
    with os.fdopen(write_fd, "w") as status_pipe:
        try:
            httpd = server.create_server()
        except Exception as e:  # noqa: BLE001 - reported to the parent
            status_pipe.write(f"error: {e}")
            return
        status_pipe.write("ok")
    server.serve(httpd)


def start(quiet: bool = False) -> None:
    """Start the server in the background unless it is already running."""
    info = health()
    if info:
        if not quiet:
            print(f"manpage is already running at {base_url()} (pid {info['pid']})")
        return
    print("Starting manpage (indexing man pages)...", end=" ", flush=True, file=sys.stderr)
    daemonize()
    deadline = time.monotonic() + START_TIMEOUT
    while not health():
        if time.monotonic() > deadline:
            raise SystemExit(f"manpage: server did not respond, see {log_path()}")
        time.sleep(0.1)
    print("done", file=sys.stderr)


def stop() -> None:
    info = health()
    if not info:
        print("manpage is not running")
        return
    pid = int(info["pid"])
    try:
        os.kill(pid, signal.SIGTERM)
    except PermissionError:
        raise SystemExit(f"manpage: server (pid {pid}) belongs to another user") from None
    except ProcessLookupError:
        pass
    for _ in range(50):
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            break
        time.sleep(0.1)
    else:
        raise SystemExit(f"manpage: server (pid {pid}) did not stop")
    print("manpage stopped")


def status() -> int:
    info = health()
    if not info:
        print("manpage is not running")
        return 3  # LSB "program is not running"
    print(f"manpage is running at {base_url()} (pid {info['pid']}, {info['pages']} pages)")
    return 0


def open_url(url: str) -> None:
    print(url)
    xdg = shutil.which("xdg-open")
    if xdg and not os.environ.get("BROWSER"):
        # Run detached and silent: browsers like to print noise to the terminal.
        subprocess.Popen(
            [xdg, url],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    elif not webbrowser.open(url):
        print("manpage: no browser found; open the URL above manually", file=sys.stderr)


def open_page(section: str | None, name: str) -> int:
    start(quiet=True)
    api = f"/api/page/{quote(section, safe='')}/" if section else "/api/page/"
    code, body = fetch(api + quote(name, safe=""), timeout=30)
    if code != 200:
        detail = (body or {}).get("detail") or f"server returned {code}"
        print(f"manpage: {detail}", file=sys.stderr)
        return 16  # same exit code man(1) uses for a missing page
    open_url(f"{base_url()}/man/{quote(body['section'], safe='')}/{quote(body['name'], safe='')}")
    return 0


def usage(file=sys.stdout) -> None:
    print((__doc__ or "").strip(), file=file)


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv

    if args[:1] in (["-h"], ["--help"], ["help"]):
        usage()
        return 0
    if args[:1] in (["-V"], ["--version"]):
        print(f"manpage {__version__}")
        return 0

    if len(args) == 1 and args[0] in COMMANDS:
        match args[0]:
            case "start":
                start()
            case "stop":
                stop()
            case "restart":
                stop()
                start()
            case "status":
                return status()
            case "serve":
                httpd = server.create_server()
                print(f"Serving at {base_url()} (Ctrl-C to stop)", flush=True)
                server.serve(httpd)
        return 0

    if args[:1] == ["--"]:
        args = args[1:]
    if not args:
        start(quiet=True)
        open_url(base_url() + "/")
        return 0
    if len(args) == 1:
        return open_page(None, args[0])
    if len(args) == 2 and SECTION_RE.match(args[0]):
        return open_page(args[0], args[1])

    usage(sys.stderr)
    return 2
