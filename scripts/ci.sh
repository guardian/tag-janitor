#!/usr/bin/env bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="${DIR}/.."

echo "##teamcity[blockOpened name='npm']"
yarn
echo "##teamcity[blockClosed name='npm']"

echo "##teamcity[testSuiteStarted name='lint']"
yarn lint
echo "##teamcity[testSuiteFinished name='lint']"

echo "##teamcity[blockOpened name='generate-cfn']"
"${ROOT_DIR}/scripts/generate-cfn.sh"
echo "##teamcity[blockClosed name='generate-cfn']"

echo "##teamcity[compilationStarted compiler='riffraff']"
yarn riffraff # calls node-riffraff-artifact
echo "##teamcity[compilationFinished compiler='riffraff']"

