#!/bin/sh

# with node installed:
../../exe/opal --compile-to-exe node -o simple_node ./simple.rb

# it also works with eval:
../../exe/opal --compile-to-exe node -o eval_app_node -e 'puts "Hello from Opal in Node.js!"'
