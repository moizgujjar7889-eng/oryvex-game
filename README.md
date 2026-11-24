# ORYVEX

A pure HTML5 Canvas + vanilla JavaScript mobile arcade game.

## Run locally
Serve this folder with a local web server (PWA service workers do not work from `file://`):
- Python: `python -m http.server 8000`
- Open `http://localhost:8000`

## Logo and icons
`logo.png` is the supplied 1254×1254 logo and is used on the title screen.
`icon-192.png` and `icon-512.png` are resized versions for PWA installation.

To regenerate icon sizes from logo.png with ImageMagick:
```sh
magick logo.png -resize 192x192 icon-192.png
magick logo.png -resize 512x512 icon-512.png
```

## GitHub Pages
1. Create a new GitHub repository, e.g. `oryvex-game`.
2. Upload all files in this folder to the repository root (not the ZIP itself).
3. Commit to the `main` branch.
4. Open Settings → Pages.
5. Under Build and deployment, choose “Deploy from a branch”.
6. Choose `main` and `/ (root)`, then Save.
7. Wait for the Pages URL to appear and open it on your phone.
8. Use your browser's “Add to Home Screen” / “Install app” option.

GitHub Pages serves over HTTPS, which enables PWA installation and service workers.
