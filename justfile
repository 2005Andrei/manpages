prefix := env("PREFIX", home_directory() / ".local")
share := prefix / "share" / "manpage"

run:
    #!/usr/bin/env bash
    trap 'kill $(jobs -p) 2>/dev/null' EXIT
    bun run dev &
    python3 -m manpage serve

build:
    bun install --frozen-lockfile
    bun run build

install: build
    install -Dm755 bin/manpage "{{prefix}}/bin/manpage"
    install -Dm644 -t "{{share}}/manpage" manpage/*.py
    rm -rf "{{share}}/dist"
    find dist -type f -exec install -Dm644 {} "{{share}}/{}" \;
    @echo "Installed. Run 'manpage ls' (make sure {{prefix}}/bin is on your PATH)."

uninstall:
    -"{{prefix}}/bin/manpage" stop
    rm -rf "{{prefix}}/bin/manpage" "{{share}}"

aur:
    cd aur && makepkg -f --cleanbuild && makepkg --printsrcinfo > .SRCINFO
