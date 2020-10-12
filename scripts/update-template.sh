#!/usr/bin/env bash

set -e

STAGE=$1
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="${DIR}/.."
TEMPLATE="${ROOT_DIR}/cloudformation/cdk/CdkStack.template.json"
PROFILE="media-service"


if [[ -z "${STAGE}" ]]; then
  echo -e "Please pass STAGE"
  exit 1
fi

"${ROOT_DIR}"/scripts/generate-cfn.sh

npx cfn update-template \
  -p "${PROFILE}" \
  -s tag-janitor-"${STAGE}" \
  -t "${TEMPLATE}"
