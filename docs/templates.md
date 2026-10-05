# Templates with Opal

Opal includes support for running erb templates on the client. Haml templates
can also be used via the `opal-haml` gem.

## Basic Templates

If you require `template.rb` from the stdlib, then all compiled templates will
be available on the `Template` object. Each compiled template will be an
instance of `Template`, which provides a basic standard rendering api to make
rendering a uniform method on the client.

For example, to access a template named `user`:

```ruby
require 'template'

template = Template['user']
context  = User.new('Ford Prefect')

puts template.render(context)
# => "<div>...</div>"
```

`#render()` will run the template in the given context, and return the result
as a string. This is usually a html string, but it can be used for any dynamic
content.

### Registered Templates

You can get a quick list of all registered templates using `.paths`:

```ruby
Template.paths
# => [#<Template: 'views/user'>, #<Template: 'login'>]
```

These names are the keys used to access a template:

```ruby
Template['login']
# => #<Template: 'login'>
```

## ERB Templates

Support for `erb` templates is built in directly to Opal (`.opalerb` files) and its stdlib.
There is one caveat though when working with sprockets - it must have the
`.opalerb` file extension, instead of `.erb`. This is because sprockets has a
built in handler for `.erb` files.

If we have the same user class as above, create an `app/views/user.opalerb`
file:

```erb
<!-- app/views/user.opalerb -->
<div class="row">
  <div class="col-md-3"><%= self.name %></div>
</div>
```

Again, you must then require the template (without the `.opalerb` extension):

```ruby
# app/application.rb
require 'opal'
require 'views/user'
```

And then you can access and render the template:

```ruby
# app/application.rb

template = Template['views/user']
user = User.new('Ford Prefect')

puts template.render(user)
# => "<div class="row">...</div>"
```

## Ruby ERB templates at build time (`.rb.erb`, `.js.erb`)

The builder (and so `opal`) also renders Ruby ERB templates while building,
like Ruby's `ERB.new(source).result` (`<%= expr %>`, `<% code %>`,
`<%# comment %>`, `<%%` for a literal `<%`):

* `name.rb.erb` is rendered, then compiled as Ruby (`require "name"`)
* `name.js.erb` (any `.erb`) is rendered into JavaScript, loaded as the
  module `name`

```erb
# app/config.rb.erb
BUILT_AT = <%= Time.now.to_i %>
VERSION = <%= File.read(File.join(__dir__, "VERSION")).strip.inspect %>
```

The template's code runs in Opal (with the Node.js stdlib: `File`, `Dir`,
`ENV`, `__dir__`, ...), in a worker thread of the build. It can't `require`
other files of your program.

At runtime, with `opal-parser` (also in the browser), `Opal::ERB.render`
renders a template in the running program:

```ruby
require "opal-parser"
Opal::ERB.render("1 + 1 = <%= 1 + 1 %>") # => "1 + 1 = 2"
```

## Haml templates

`opal-haml` allows `.haml` templates to be compiled, just like opal compiles
ruby code, ready to run on the client. (It is a Ruby gem working with the
Sprockets pipeline, for Opal 1.x.)

To get started, add to your Gemfile:

```ruby
# Gemfile
gem 'opal'
gem 'opal-haml'
```

`opal-haml` simply registers the `.haml` template to be handled under sprockets.
This means, that you can simply `require()` a haml template in your code.

Lets say you have the following simple opal app:

```ruby
# app/application.rb
require 'opal'

class User < Struct.new(:name, :age)
end
```

We want to create an instance of the `User` class and render it using a haml
template. Lets first create that template as `app/views/user.haml`:

```haml
-# app/views/user.haml
.row
  .col-md-6
    = self.name
  .col-md-6
    = self.age
```

You are nearly ready to go. Lets create a user instance and render the template
in the context of that user:

```ruby
# app/application.rb
require 'opal'
require 'views/user'

class User < Struct.new(:name, :age)
end

ford = User.new('Ford Prefect', 42)
template = Template['views/user']

puts template.render(ford)
```

Note, when requiring haml templates you do not need to specify the `.haml`
extension. This code will print the rendered html to the console. If you
check it out, you should see it compiled into something like the following:

```html
<div class="row">
  <div class="col-md-6">
    Ford Prefect
  </div>
  <div class="col-md-6">
    42
  </div>
</div>
```
