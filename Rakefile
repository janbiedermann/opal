# FIXME: there must be a better way
Encoding.default_external = 'utf-8'

import 'tasks/github.rake'
import 'tasks/testing.rake'
import 'tasks/building.rake'
import 'tasks/linting.rake'
import 'tasks/benchmarking.rake'
import 'tasks/releasing.rake'
import 'tasks/performance.rake'
import 'tasks/potch.rake'

task :default => [:rspec, :potch, :mspec, :minitest]
