#!/usr/bin/env bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="${DIR}/.."

pushd "${ROOT_DIR}/lambda"
yarn # install dependencies
yarn start # runs the handler locally
popd
