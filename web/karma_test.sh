#!/bin/bash

set -euo pipefail
./$1 start $2 --single-run \
  --root 'plugins/code-coverage/web/_bazel_ts_out_tests/' \
  --test-files '*_test.js' \
  --browsers ${3:-ChromeHeadless}
