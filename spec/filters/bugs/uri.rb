# NOTE: run bin/format-filters after changing this file
opal_filter "URI" do
  fails "URI#select conforms to the MatzRuby tests" # the parts of the shared examples that run touch the ftp scheme, which is not ported
  fails "URI#select raises an ArgumentError if a component is requested that isn't valid under the given scheme" # the components involved belong to the mailto and ftp schemes, which are not ported
  fails "URI#select raises an ArgumentError if given strings rather than symbols" # in Opal a Symbol compares equal to the String of the same name
  fails "URI.parse populates the components of a parsed URI::FTP object" # the ftp scheme is not ported
  fails "URI.parse populates the components of a parsed URI::LDAP object" # the ldap scheme is not ported
  fails "URI.parse populates the components of a parsed URI::MailTo object" # the mailto scheme is not ported
  fails "URI.parse returns a URI::LDAP object when parsing an LDAP URI" # the ldap scheme is not ported
  fails "URI.parse returns a URI::MailTo object when passed a mailto URI" # the mailto scheme is not ported
  fails "URI::Parser#parse populates the components of a parsed URI::FTP object" # the ftp scheme is not ported
  fails "URI::Parser#parse populates the components of a parsed URI::LDAP object" # the ldap scheme is not ported
  fails "URI::Parser#parse populates the components of a parsed URI::MailTo object" # the mailto scheme is not ported
  fails "URI::Parser#parse raises errors on malformed URIs" # the underscore is in the reg-name character class of the vendored pattern, which is what this parser follows
  fails "URI::Parser#parse returns a URI::LDAP object when parsing an LDAP URI" # the ldap scheme is not ported
  fails "URI::Parser#parse returns a URI::MailTo object when passed a mailto URI" # the mailto scheme is not ported
  fails "the URI method does not add a URI method to Object instances" # Opal's module_function leaves the instance copy public
end
