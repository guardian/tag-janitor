#!/usr/bin/env bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="${DIR}/.."

pushd "${ROOT_DIR}/cdk"
yarn --network-concurrency 1 --frozen-lockfile --silent
yarn lint
yarn test
popd
