#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

disabled_re=""
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --disable)
      disabled_re="$2"
      shift; shift
      ;;
    *)
      echo >&2 "Unknown argument '$1'"
      exit 1
      ;;
  esac
done

export GORGE_DISABLED_RE="$disabled_re"

# mitmdump catches all python exceptions, so
# run the script now to see if there are any
# immediate errors
python mitm.py

regex=$(python ./build_big_regex.py)
mitmdump -s ./mitm.py --allow-hosts "$regex"
