//
// File: package-extensions.js
// Author: Wadih Khairallah
// Description: 
// Created: 2025-05-14 22:56:07
const Crx = require('crx');
const fs = require('fs');
const path = require('path');

const EXT_DIR = path.resolve(__dirname, 'snag');
const KEY_PATH = path.resolve(__dirname, 'snag.pem');
const OUTPUT_PATH = path.resolve(__dirname, 'dist', 'snag.crx');

(async () => {
  try {
    const crx = new Crx({
      codebase: 'http://localhost/snag.crx',
      privateKey: fs.existsSync(KEY_PATH) ? fs.readFileSync(KEY_PATH) : undefined,
    });

    const zip = await crx.load(EXT_DIR).then(crx => crx.pack());
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, zip);

    if (!fs.existsSync(KEY_PATH)) {
      fs.writeFileSync(KEY_PATH, crx.privateKey);
    }

    console.log('Packaged extension to:', OUTPUT_PATH);
  } catch (err) {
    console.error('Packaging failed:', err);
    process.exit(1);
  }
})();

