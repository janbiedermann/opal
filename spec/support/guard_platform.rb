class PlatformGuard < SpecGuard
  HOST_OS = ENV['OPAL_PLATFORM_NAME']
  POINTER_SIZE = ENV['OPAL_POINTER_SIZE'] || WORD_SIZE
end
