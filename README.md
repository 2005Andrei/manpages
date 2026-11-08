# Manpage

Useful quick project to view manpages in the browser, you can view all manpages locally in your browser in a more appealing UI.


![dashboard](https://github.com/2005Andrei/manpages/blob/main/demo/demo.png)

![example man page](https://github.com/2005Andrei/manpages/blob/main/demo/example.png)


## Install

<!-- Arch (AUR): `yay -S manpage-git` - not yet, not until they open new account registration -->

From source (Linux and macOS; installs to `~/.local`, no root needed; requires `bun`, `python`, `man-db`, and [`just`](https://github.com/casey/just)):

```sh
just install      # PREFIX=/some/where just install to change the location
just uninstall
```

`pandoc` is optional but gives nicer rendering

## Usage

```sh
manpage ls          # open ls(1) in the browser (starts the server if needed)
manpage 3 printf    # a specific section
manpage             # dashboard
manpage start | stop | restart | status
manpage serve       # run in the foreground
```

The server listens on `127.0.0.1:8642`, you change it with `MANPAGE_PORT` / `MANPAGE_HOST`
Logs go to `~/.local/state/manpage/server.log`

## Development

`just run` starts Vite with hot reload on :5173 or 5174 (if you're running already running vite) and the API on :8642
