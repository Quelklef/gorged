#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

echo "Building extension..."

here="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"

cat > "$here/globals.js" << EOF
  (function() {

    const global = this;
    global.LIBS = {};

    let module;

    module = {};
    (function() {
      $(cat "$here"/../lib.js);
    })();
    global.LIBS.lib = module.exports;

    module = {};
    (function() {
      $(cat "$here"/../intercepts.js);
    })();
    global.LIBS.intercepts = module.exports;

  })();
EOF

cat > "$here/manifest.json" << EOF
{
  "name": "Gorged",
  "version": "$(cat "$here"/../version)",
  "description": "Block distracting content from the web",
  "permissions": [
    "storage"
  ],
  "browser_action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [
    {
      "matches": ["*://*/*"],
      "run_at": "document_start",
      "js": [
        "globals.js",
        "gorged.js"
      ]
    }
  ],
  "manifest_version": 2
}
EOF
