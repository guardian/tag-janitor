#!/usr/bin/env bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="${DIR}/.."

(
  cd "${ROOT_DIR}/lambda"
  yarn --frozen-lockfile
  yarn lint
  yarn test
  yarn compile
  yarn riffraff
)
