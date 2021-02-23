#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

nl=$'\n'

regexes=""
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --disable)
      regexes="${regexes}${nl}disable:${2}"
      shift; shift
      ;;
    --enable)
      regexes="${regexes}${nl}enable:${2}"
      shift; shift
      ;;
    *)
      echo >&2 "Unknown argument '$1'"
      exit 1
      ;;
  esac
done

export GORGE_REGEXES="$regexes"

# mitmdump catches all python exceptions, so
# run the script now to see if there are any
# immediate errors
python mitm.py

regex=$(python ./build_big_regex.py)
mitmdump -s ./mitm.py --allow-hosts "$regex"
