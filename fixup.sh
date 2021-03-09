#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Format / lint / etc
py_files=$(./ls-src-files.sh | grep '.py$') && IFS=$'\n' py_files=($py_files)
js_files=$(./ls-src-files.sh | grep '.js$') && IFS=$'\n' js_files=($js_files)
npx prettier "${js_files[@]}" --arrow-parens=avoid --write
./venv/bin/black "${py_files[@]}" --line-length=140
./venv/bin/isort "${py_files[@]}"
./venv/bin/flake8 "${py_files[@]}" --max-line-length=140 --ignore=W503,E722,E731,E203,F811

./as-ext/build.sh

echo "Regenerating README.md ..."
node -e '
  function joinSurround(delim, items) {
    return delim + items.join(delim) + delim;
  }

  function rowOf(string, substring) {
    if (!string.includes(substring))
      throw Error("Substring must be in string");
    return string.slice(0, string.indexOf(substring)).split("\n").length - 1;
  }

  function makeDocs(markdown, mods) {
    const beginRow = rowOf(markdown, "BEGIN FLAG DOCS");
    const endRow = rowOf(markdown, "END FLAG DOCS");

    return (
      markdown.split("\n").slice(0, beginRow + 1).join("\n")
      + "\n\n"
      + makeTable(mods)
      + "\n\n"
      + markdown.split("\n").slice(endRow).join("\n")
    );
  }

  function makeTable(mods) {
    return (
      "|Website|Effect|"
      + "\n|-|-|"
      + "\n"
      + mods.map(mod =>
        joinSurround("|", [
          mod.sites.join(", "),
          mod.desc,
        ])
      ).join("\n")
    );
  }

  const fs = require("fs");
  const { mods } = require("./mods.js");

  const existingMd = fs.readFileSync("./README.md").toString();
  const newMd = makeDocs(existingMd, mods);
  fs.writeFileSync("./README.md", newMd);
'
