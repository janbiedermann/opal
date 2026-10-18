# NOTE: run bin/format-filters after changing this file
opal_filter "English" do
  fails "English aliases $! to $ERROR_INFO and $ERROR_INFO still returns an Exception with a backtrace" # Integer#/ returns a Float, so 1/0 gives Infinity instead of raising
  fails "English aliases $@ to $ERROR_POSITION and $ERROR_POSITION still returns a backtrace" # Integer#/ returns a Float, so 1/0 gives Infinity instead of raising
  fails "English aliases $IGNORECASE to $=" # $= is not implemented: Ruby dropped $IGNORECASE in 1.9 and keeps $= only as a deprecated read
end
