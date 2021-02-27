#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

function src_files { find | grep -E "\\.$1\$" | grep -vE '/(venv|node_modules|__pycache__)/'; }

# workflow
[ "${1:-}" = "-w" ] && {
  source ./venv/bin/activate
  src_files 'py|js' | entr -c "$0"
}

# Format / lint / etc
py_files=$(src_files py) && IFS=$'\n' py_files=($py_files)
js_files=$(src_files js) && IFS=$'\n' js_files=($js_files)
black_args=('--line-length=140')
npx prettier "${js_files[@]}" --arrow-parens=avoid --write
black "${py_files[@]}" "${black_args[@]}" --fast  #| run twice with --fast in order to
black "${py_files[@]}" "${black_args[@]}" --fast  #| deal with https://github.com/psf/black/issues/1629
isort "${py_files[@]}"
flake8 "${py_files[@]}" --max-line-length=140 --ignore=W503,E722,E731,E203,F811

# Regenerate readme
echo "Updating README.md"
node -e '
  function joinSurround(delim, items) {
    return delim + items.join(delim) + delim;
  }

  function rowOf(string, substring) {
    if (!string.includes(substring))
      throw Error("Substring must be in string");
    return string.slice(0, string.indexOf(substring)).split("\n").length - 1;
  }

  function makeDocs(markdown, intercepts) {
    const beginRow = rowOf(markdown, "BEGIN FLAG DOCS");
    const endRow = rowOf(markdown, "END FLAG DOCS");

    return (
      markdown.split("\n").slice(0, beginRow + 1).join("\n")
      + "\n\n"
      + makeTable(intercepts)
      + "\n\n"
      + markdown.split("\n").slice(endRow).join("\n")
    );
  }

  function makeTable(intercepts) {
    return (
      "|Name|Description|"
      + "\n|-|-|"
      + "\n"
      + intercepts.map(intercept =>
        joinSurround("|", [
          "`" + intercept.id + "`",
          intercept.desc,
        ])
      ).join("\n")
    );
  }

  const fs = require("fs");
  const { intercepts } = require("./intercepts.js");

  const existingMd = fs.readFileSync("./README.md").toString();
  const newMd = makeDocs(existingMd, intercepts);
  fs.writeFileSync("./README.md", newMd);
'
