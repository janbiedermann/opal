# NOTE: run bin/format-filters after changing this file
opal_filter "Timeout" do
  fails "Timeout.timeout raises Timeout::Error when it times out with no specified error type" # the deadline needs a watcher thread, and sleep with no argument does not block
  fails "Timeout.timeout raises specified error type with a default message when it times out if message is nil" # the deadline needs a watcher thread, and sleep with no argument does not block
  fails "Timeout.timeout raises specified error type with specified message when it times out" # the deadline needs a watcher thread, and sleep with no argument does not block
end
