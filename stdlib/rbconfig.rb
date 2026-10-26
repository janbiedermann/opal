module RbConfig
  versions = RUBY_VERSION.split('.')
  CONFIG = {
    'ruby_version' => RUBY_VERSION,
    'MAJOR'        => versions[0],
    'MINOR'        => versions[1],
    'TEENY'        => versions[2],
    'RUBY'         => RUBY_ENGINE,
    'RUBY_INSTALL_NAME' => RUBY_ENGINE,
    'ruby_install_name' => RUBY_ENGINE,
    'RUBY_SO_NAME'      => RUBY_ENGINE,
    'target_os'         => 'ECMA-262',
    'host_os'           => 'ECMA-262',
    'PATH_SEPARATOR'    => ':',
    'EXEEXT'            => '',
    'bindir'            => '',
  }
end

# required for mspec it would appear - the ruby_exe helper spawns it to run
# its probe programs, and exe/ruby is the command line's Ruby (CRuby-style
# options); exe/opal is compiler-only now
RUBY_EXE = 'exe/ruby'
