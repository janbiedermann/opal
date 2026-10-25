# cgi/escape: the CRuby feature name for the CGI escape helpers
# (CGI.escapeHTML, CGI.escape, ...). opal ships them in cgi/util; this
# is the feature-name alias code written against CRuby expects - rack
# 3 requires 'cgi/escape'.
require 'cgi/util'
