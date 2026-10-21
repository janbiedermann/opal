require 'uri'

# The relative-ref pattern of the ported RFC 3986 parser: upstream's
# path_absolute is `/SEG*` - its `\g<seg>*+` calls the seg subexpression and the
# possessive star applies to the whole call - so a path of one slash parses. The
# port had `/SEG+` there, which refused the argument Gem::Source hands
# #enforce_trailing_slash for a source URI with no path, `uri.merge("/")`.
# ruby/spec parses no lone slash, so nothing covered the alternative.

describe 'URI.parse of a relative ref' do
  it 'takes a path that is only a slash' do
    uri = URI.parse '/'

    uri.class.should == URI::Generic
    uri.path.should == '/'
    uri.to_s.should == '/'
    uri.host.should == nil
  end

  it 'keeps the other relative refs the pattern already took' do
    URI.parse('/a?b').path.should      == '/a'
    URI.parse('/a?b').query.should     == 'b'
    URI.parse('a/b').path.should       == 'a/b'
    URI.parse('//h/x').path.should     == '/x'
    URI.parse('//h/x').host.should     == 'h'
    URI.parse('?q').query.should       == 'q'
    URI.parse('#f').fragment.should    == 'f'
    URI.parse('').path.should          == ''
  end

  it 'still refuses what is not a URI' do
    -> { URI.parse 'foo bar' }.should raise_error(URI::InvalidURIError)
  end

  it 'merges a lone slash onto a source URI without a path' do
    URI.parse('http://rubygems.org').merge('/').to_s.should == 'http://rubygems.org/'
    URI.parse('https://rubygems.org').merge('/').path.should == '/'
  end
end
