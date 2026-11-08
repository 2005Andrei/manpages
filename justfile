prefix := env("PREFIX", home_directory() / ".local")
share := prefix / "share" / "manpage"

# Dev mode: Vite (hot reload) on :5173, API on :8642. Ctrl-C stops both.
run:
    #!/usr/bin/env bash
    trap 'kill $(jobs -p) 2>/dev/null' EXIT
    bun run dev &
    python3 -m manpage serve

build:
    bun install --frozen-lockfile
    bun run build

# Install to ~/.local (override with PREFIX=...); no root, no Python packages.
install: build
    install -Dm755 bin/manpage "{{prefix}}/bin/manpage"
    install -Dm644 -t "{{share}}/manpage" manpage/*.py
    rm -rf "{{share}}/dist"
    find dist -type f -exec install -Dm644 {} "{{share}}/{}" \;
    @echo "Installed. Run 'manpage ls' (make sure {{prefix}}/bin is on your PATH)."

uninstall:
    -"{{prefix}}/bin/manpage" stop
    rm -rf "{{prefix}}/bin/manpage" "{{share}}"

# Build the AUR package locally from the latest pushed commit.
aur:
    cd aur && makepkg -f --cleanbuild && makepkg --printsrcinfo > .SRCINFO
