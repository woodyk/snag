chrome.action.onClicked.addListener(async (tab, info) => {
    const shiftPressed = info?.modifiers?.includes("Shift") ?? false;
    await captureFullPage(tab, shiftPressed);
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "trigger-snag-save") {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (tab) captureFullPage(tab, false);
        });
    }
});

async function captureFullPage(tab, clipboardMode = false) {
    const timestamp = new Date().toISOString();
    const fileTag = timestamp.replace(/[:.]/g, '').slice(0, 15);
    const filename = `full_page_${fileTag}.png`;

    let scrollX = 0, scrollY = 0;
    try {
        // Get layout metrics once
        const [{ result: page }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
                scrollX: window.scrollX,
                scrollY: window.scrollY,
                totalHeight: document.documentElement.scrollHeight,
                viewportHeight: window.innerHeight,
                title: document.title,
                url: location.href
            })
        });

        scrollX = page.scrollX;
        scrollY = page.scrollY;

        const totalSegments = Math.ceil(page.totalHeight / page.viewportHeight);
        const images = [];

        console.log(`Snag: Will capture ${totalSegments} segments.`);

        for (let i = 0; i < totalSegments; i++) {
            const y = i * page.viewportHeight;

            // Scroll viewport
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: y => window.scrollTo(0, y),
                args: [y]
            });

            await new Promise(r => setTimeout(r, 400)); // Wait for redraw

            // Capture current viewport
            const url = await new Promise(res =>
                chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, res)
            );
            const blob = await (await fetch(url)).blob();
            const img = await createImageBitmap(blob);
            images.push(img);
            console.log(`Snag: Captured segment ${i + 1}/${totalSegments}, ${img.width}x${img.height}`);
        }

        if (images.length === 0) throw new Error("No captures completed.");

        const width = images[0].width;
        const height = images.reduce((sum, img) => sum + img.height, 0);

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");

        let offsetY = 0;
        for (const img of images) {
            ctx.drawImage(img, 0, offsetY);
            offsetY += img.height;
        }

        const composedBlob = await canvas.convertToBlob();
        const composedBytes = new Uint8Array(await composedBlob.arrayBuffer());

        const manifest = {
            url: page.url,
            title: page.title,
            timestamp,
            tab_id: tab.id,
            window_id: tab.windowId
        };

        const base64 = insertPNGTextChunk(composedBytes, [
            ['CapturedURL', page.url],
            ['PageTitle', page.title],
            ['Timestamp', timestamp],
            ['SnagManifest', JSON.stringify(manifest)]
        ]);

        const dataUrl = 'data:image/png;base64,' + base64;
        const finalBlob = await (await fetch(dataUrl)).blob();

        if (clipboardMode) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': finalBlob })]);
            console.log("Snag: Image copied to clipboard.");
        } else {
            await chrome.downloads.download({
                url: dataUrl,
                filename,
                saveAs: true
            });
            console.log("Snag: Image downloaded.");
        }

    } catch (err) {
        console.error("Snag: Capture error:", err);
    } finally {
        // Restore scroll
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (x, y) => window.scrollTo(x, y),
            args: [scrollX, scrollY]
        });
    }
}

// --- PNG Metadata Injection Utilities ---

function insertPNGTextChunk(pngBytes, entries) {
    const chunks = [];
    chunks.push(...pngBytes.slice(0, 8));
    let i = 8;
    while (i < pngBytes.length) {
        const len = readUint32(pngBytes, i);
        const type = readString(pngBytes, i + 4, 4);
        const end = i + 8 + len + 4;
        chunks.push(...pngBytes.slice(i, end));
        i = end;
        if (type === 'IHDR') {
            for (const [k, v] of entries) {
                chunks.push(...buildTextChunk(k, v));
            }
        }
    }
    return uint8ToBase64(new Uint8Array(chunks));
}

function buildTextChunk(k, v) {
    const payload = new TextEncoder().encode(`${k}\0${v}`);
    const len = payload.length;
    const type = [0x74, 0x45, 0x58, 0x74]; // 'tEXt'
    const out = new Uint8Array(8 + len + 4);
    writeUint32(out, 0, len);
    out.set(type, 4);
    out.set(payload, 8);
    const crc = crc32(out.slice(4, 8 + len));
    writeUint32(out, 8 + len, crc);
    return out;
}

function writeUint32(buf, offset, val) {
    buf[offset] = (val >>> 24) & 0xff;
    buf[offset + 1] = (val >>> 16) & 0xff;
    buf[offset + 2] = (val >>> 8) & 0xff;
    buf[offset + 3] = val & 0xff;
}

function readUint32(buf, offset) {
    return (buf[offset] << 24) |
           (buf[offset + 1] << 16) |
           (buf[offset + 2] << 8) |
           (buf[offset + 3]);
}

function readString(buf, offset, len) {
    return String.fromCharCode(...buf.slice(offset, offset + len));
}

function uint8ToBase64(uint8arr) {
    let bin = '', chunk = 0x8000;
    for (let i = 0; i < uint8arr.length; i += chunk) {
        bin += String.fromCharCode.apply(null, uint8arr.subarray(i, i + chunk));
    }
    return btoa(bin);
}

function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
        c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
    }
    return (c ^ -1) >>> 0;
}

const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        t[n] = c;
    }
    return t;
})();
