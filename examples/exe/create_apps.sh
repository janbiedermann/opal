#!/bin/sh

# Comment those below, which are not installed or available for your platform,
# then execute this script to create some very simple apps.

# with bun installed:
../../exe/opal --compile-to-exe bun -o simple_bun ./simple.rb

# with deno installed:
../../exe/opal --compile-to-exe deno -o simple_deno ./simple.rb

# with node installed:
../../exe/opal --compile-to-exe node -o simple_node ./simple.rb

# on macOS only:
../../exe/opal --compile-to-exe osascript -o simple_osa ./simple.rb
# execute the macOS app from the terminal as:
# ./simple_osa.app/Contents/MacOS/applet

# with quickjs installed:
../../exe/opal --compile-to-exe quickjs -o simple_quickjs ./simple.rb

# it also works with eval:
../../exe/opal --compile-to-exe quickjs -o eval_app_quickjs -e 'puts "Hello from Opal in QuickJS!"'
