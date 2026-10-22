# frozen_string_literal: true

module Bundler
  module UI
    # Opal: upstream autoloads the three; the port requires them (the bundle
    # rule of eager requires).
    require_relative "ui/silent"
    require_relative "ui/shell"
    require_relative "ui/rg_proxy"
  end
end
