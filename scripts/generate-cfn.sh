#!/usr/bin/env bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="${DIR}/.."
OUTPUT_DIR="${ROOT_DIR}/cloudformation/cdk"

pushd "${ROOT_DIR}"/cdk || exit
yarn --frozen-lockfile --silent
rm -r "${OUTPUT_DIR}" || true
yarn cdk synth -o "${OUTPUT_DIR}" > /dev/null
popd
