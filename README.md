# Snag – Full Page Screenshot Extension

Snag is a Chrome extension that captures full-page screenshots as high-quality
PNGs, enriched with embedded metadata and HTML snapshots. It provides both a
save-to-file and copy-to-clipboard mode with intuitive shortcuts.

## Features

- Full-page capture using DevTools protocol (includes off-screen content)
- Embedded metadata:
    - Page title
    - URL
    - Timestamp
    - Full HTML snapshot
    - JSON manifest
- Clipboard mode with Shift-click
- Hotkey support
- Dark-mode styled icon

## Keyboard Shortcuts

| Action                    | Shortcut                   |
|---------------------------|----------------------------|
| Save full-page screenshot | Shift+Cmd+P (Mac)          |
|                           | Shift+Ctrl+P (Windows)     |
| Copy to clipboard         | Shift+Click extension icon |

## Toolbar Usage

- Click icon → Save PNG to disk via file picker
- Shift+Click icon → Copy PNG to clipboard

## File Output

- Filename format: full_page_YYYYMMDD_HHMMSS.png
- Format: PNG with embedded tEXt chunks
- Metadata keys:
    - CapturedURL
    - Timestamp
    - Title
    - SnagManifest (JSON)
    - HTMLSnapshot (base64-encoded HTML, truncated to 500KB)

## Installation

1. Go to chrome://extensions/
2. Enable Developer Mode (toggle top-right)
3. Click "Load unpacked"
4. Select the `snag/` directory

## Verifying Metadata

To inspect embedded PNG metadata, use:

    exiftool full_page_*.png
    pngcheck -t full_page_*.png

## Project Files

    snag/
    ├── manifest.json       # Extension config & hotkeys
    ├── background.js       # Core logic and DevTools capture
    ├── icon.png            # Minimal blocky 'S' logo
    └── README.md           # This documentation

## Author

Created by Ms. White 

