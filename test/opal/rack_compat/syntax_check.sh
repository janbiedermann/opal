#!/bin/sh
# Syntax-compile every file of the rack gem with the tree's exe/ruby.
# Usage: from the opal tree root, RACK=/path/to/rack/checkout ./test/opal/rack_compat/syntax_check.sh
RACK=${RACK:-/root/workspace/rack}
for f in $(find "$RACK/lib" -name '*.rb' | sort); do
  if timeout 60 ./exe/ruby -c "$f" >/dev/null 2>&1; then
    echo "ok   ${f#*/lib/}"
  else
    echo "FAIL ${f#*/lib/}  -> $(./exe/ruby -c "$f" 2>&1 | head -2 | tr '\n' ' ')"
  fi
done
