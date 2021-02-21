#!/usr/bin/bash
regex=$(python ./build_big_regex.py) &&
mitmdump -s ./mitm.py --allow-hosts "$regex"
