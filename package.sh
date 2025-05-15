#!/usr/bin/env bash
#
# File: package.sh
# Author: Wadih Khairallah
# Description: 
# Created: 2025-05-14 23:01:05
# Modified: 2025-05-14 23:01:54

npm install crx
node package-extension.js   # or package-extensions.js

# Then commit + push to main
git add .
git commit -m "Setup CI packaging"
git push
