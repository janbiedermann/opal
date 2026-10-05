# Static Building

`opal` makes it easy to build static opal applications. Opal uses internal load
paths to make it easy to handle resolving requirements during building.

## Overview

First, get `opal` (see [Getting Started](getting_started.md)); here
`opal` is `exe/opal` of an Opal checkout.

Next, we want to add our main app code. Keep all opal code inside `app/`
directory, and edit `app/application.rb`:

```ruby
# app/application.rb
require "opal"

puts "Wow, running opal!"
```

You will notice the `require "opal"` line which will automatically include the
opal runtime and corelib into our output, giving us access to the `puts()`
method.

To build this, we add our `app/` directory to the load path and build our
target file `application.rb`, which will be found because it is inside our
added load path:

```
$ opal --compile --no-opal --no-exit -I app -o build.js app/application.rb
```

or, from a build script (`build.mjs`, run with `node build.mjs`):

```js
import { writeFileSync } from "node:fs";
import { Builder } from "./opal/lib/opal/compiler/builder/builder.mjs";

const builder = new Builder();
builder.appendPaths("app");
builder.build("application");
writeFileSync("build.js", builder.toString());
```

Either way you get the `build.js` output file with our application compiled,
with the opal runtime included as well.

To run the application, lets create a very simple html file:

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="build.js"></script>
  </head>
  <body>
  </body>
</html>
```

Now, open this html file and check the browsers console. You should see our
message printed in the console.
