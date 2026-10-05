Usage:

    node tasks/bench.mjs ips
    node tasks/bench.mjs ips benchmark-ips/bm_while_true_vs_loop.rb

benchmark-ips isn't part of Opal: set `BENCHMARK_IPS_LIB` to the `lib`
directory of a checkout of https://github.com/evanphx/benchmark-ips.
For details see `tasks/bench.mjs`.
