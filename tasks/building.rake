require 'opal/version'

desc <<-DESC
Build *corelib* and *stdlib* to "build/"

You can restrict the file list with the FILES env var (comma separated)
and the destination dir with the DIR env var, FORMATS to select output formats.

Example: rake dist DIR=/tmp/foo FILES='opal.rb,base64.rb'
Example: rake dist DIR=cdn/opal/#{Opal::VERSION}
Example: rake dist DIR=cdn/opal/master
Example: rake dist DIR=cdn/opal/master FORMATS=js,min,gz
Example: rake dist DIR=cdn/opal/master FORMATS=js,map
DESC
task :dist do
  sh 'node', 'tasks/dist.mjs'
end

desc 'Remove any generated file.'
task :clobber do
  rm_r './build'
end

