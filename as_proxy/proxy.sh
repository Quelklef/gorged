#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Kill child processes when parent dies
# Ugh, none of this shit seems to work
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT
trap "exit" INT TERM
trap "kill 0" EXIT

# Start HTML-handling JS server
node gorged.js &

# Wait until UNIX socket is created
until [ -e ./ipc.sock ]; do sleep 0.25; done

# Start MITM Proxy
regex=$(node -e '
  const { intercepts } = require("../intercepts.js");
  const regexes = intercepts.flatMap(intercept => intercept.impls).map(impl => impl.regex);
  const composite = regexes.map(regex => "(" + regex.source + ")").join("|");
  console.log(composite);
')
mitmdump -s ./mitm.py --allow-hosts "$regex"

# Fucking darn it
echo "Press q to terminate"
while true; do
  read -n1 pressed
  [ "$pressed" = "q" ] && {
    echo
    echo "Exiting"
    exit 0
  }
done
