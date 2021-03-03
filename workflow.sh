#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

function help {
  echo 'Run like one of'
  echo '  ./workflow.sh proxy  # working on proxy'
  echo '  ./workflow.sh ext    # working on extension'
  exit 1
}

target=
while [ "$#" -gt 0 ]; do
  case "$1" in
    proxy)
      target="$1"
      shift
      ;;

    ext)
      target="$1"
      shift
      ;;

    *)
      help
  esac
done

[ -n "$target" ] || help

# ----- #

here="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
cd "$here"

source ./venv/bin/activate

case "$target" in
  proxy)
    ./ls-src-files.sh | entr -cs './fixup.sh && node ./as-proxy/main.js'
    ;;

  ext)
    ./ls-src-files.sh | entr -cs './fixup.sh'
    ;;
esac
