# Adjusting Load Paths with Opalfile

The `Opalfile` plays a role in the configuration of Opal projects, particularly in adjusting and managing the load paths that are essential for the inclusion and execution of Ruby code in the Opal environment. This document outlines how to leverage `Opalfile` for customizing load paths and adding gem dependencies to streamline the development of Opal-based applications and libraries.

## Overview

An `Opalfile` is used to define a set of directives that influence how an Opal project is built and compiled. Among its capabilities, adjusting load paths is a fundamental feature, allowing developers to specify which directories or files should be accessible to the Opal compiler. This is essential for including project-specific libraries or dependencies.

`Opalfile` location is resolved whenever a file is compiled or a load path is added (either by `Opalfile` or in compilation process). The path is scanned for `Opalfile` - first directly, then its parent directories, the resolution is finished when `Opalfile` is located.

`Opalfile` can be used both inside a standalone project or inside a library. A project is a directory with an `Opalfile` (or a `Gemfile` or `*.gemspec`, for libraries that are also gems).

The Opalfile is read by Opal's builder (in JavaScript), which understands the directives below with string arguments (and `__dir__`, e.g. `add_load_path __dir__ + "/lib"`), comments, and `if RUBY_ENGINE == 'opal'` / `unless RUBY_ENGINE == 'opal'` blocks (the builder counts as `'opal'`). Anything else is an error.

## Adjusting Load Paths

The load path adjustment in `Opalfile` is straightforward. By using the `add_load_path` directive, you can add directories to the load path, making them searchable by the Opal builder.

For standalone applications, there is no default load path specified, so one must be added either in the build process or inside `Opalfile` and it's recommended to use `Opalfile` for this case.

Libraries may have different implementations for frontend and backend code - in this case, it's customary to use `lib` and `lib-opal`, and the `Opalfile` adds `lib-opal`.

### Syntax

```ruby
add_load_path 'path/to/directory/relative/to/opalfile'
add_load_path '/absolute/path'
```

### Example

Consider you have a directory structure like this:

```
my_opal_project/
  |- lib/
  |    `- my_project
  |         `- version.rb
  |- src/
  `- vendor/
```

To include the `lib` and `vendor` directories in the load path, your `Opalfile` would look like this:

```ruby
add_load_path 'lib'
add_load_path 'vendor'
```

This ensures that the Opal compiler can find and include any Ruby file located within these directories. For instance, if you want to load the `version.rb` file, you would write `require "my_project/version"` and Opal will know where to find it.

## Gem Dependencies

`add_gem_dependency 'gem_name'` added the load paths of a Ruby gem. Opal 2 runs
on Node.js and has no access to gems, so the directive is ignored with a
warning; add the library's directory with `add_load_path` (or `-I` on the
command line) instead.
