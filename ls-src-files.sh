#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
find -type f | { grep -vE '/(\.git|venv|node_modules|__pycache__|chrome-profile)/' || [ $? = 1 ]; }
