#!/usr/bin/env bash

set -e

if [[ ! -z "${TEAMCITY_VERSION}" ]]; then
  echo "Running in TeamCity. Nope!"
  exit 0
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="${DIR}/.."

CDK_OUTPUT_DIR="${ROOT_DIR}/cloudformation/cdk"


(
  cd "${ROOT_DIR}/cdk"
   yarn --frozen-lockfile
   yarn lint
   yarn test
   yarn cdk synth -o "${CDK_OUTPUT_DIR}"
)

(
  cd "${ROOT_DIR}/lambda"
  yarn --frozen-lockfile
  yarn lint
  yarn test
  yarn compile
  yarn riffraff
)
