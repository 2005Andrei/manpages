prefix := env_var_or_default("PREFIX", env_var("HOME") / ".local")
share := prefix / "share" / "manpage"

run:
    #!/usr/bin/env bash
    trap 'kill $(jobs -p) 2>/dev/null' EXIT
    bun run dev &
    python3 -m manpage serve

check-deps:
    #!/usr/bin/env bash
    set -euo pipefail
    missing=0
    for cmd in bun python3 man; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            echo "error: '$cmd' not found on PATH" >&2
            missing=1
        fi
    done
    if command -v python3 >/dev/null 2>&1 && ! python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))'; then
        echo "error: python3 >= 3.10 required, found $(python3 -V 2>&1) at $(command -v python3)" >&2
        missing=1
    fi
    if [ "$missing" -ne 0 ]; then
        echo "Install the missing dependencies and retry." >&2
        exit 1
    fi

build: check-deps
    bun install --frozen-lockfile
    bun run build

install: build
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p "{{prefix}}/bin"
    install -m755 bin/manpage "{{prefix}}/bin/manpage"
    rm -rf "{{share}}"
    mkdir -p "{{share}}/manpage"
    install -m644 manpage/*.py "{{share}}/manpage/"
    while IFS= read -r -d '' f; do
        mkdir -p "{{share}}/$(dirname "$f")"
        install -m644 "$f" "{{share}}/$f"
    done < <(find dist -type f -print0)
    echo "Installed to {{prefix}}. Run 'manpage ls' to try it."
    case ":$PATH:" in
        *":{{prefix}}/bin:"*) ;;
        *) echo "note: {{prefix}}/bin is not on your PATH; add it in your shell profile, e.g." >&2
           echo "    export PATH=\"{{prefix}}/bin:\$PATH\"" >&2 ;;
    esac

uninstall:
    -"{{prefix}}/bin/manpage" stop
    rm -rf "{{prefix}}/bin/manpage" "{{share}}"

aur:
    cd aur && makepkg -f --cleanbuild && makepkg --printsrcinfo > .SRCINFO
