#!/usr/bin/env bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="${DIR}/.."

pushd "${ROOT_DIR}/lambda"
echo "##teamcity[blockOpened name='npm']"
yarn
echo "##teamcity[blockClosed name='npm']"

echo "##teamcity[testSuiteStarted name='lint']"
yarn lint
echo "##teamcity[testSuiteFinished name='lint']"

echo "##teamcity[testSuiteStarted name='compile']"
yarn compile
echo "##teamcity[testSuiteFinished name='compile']"

popd

echo "##teamcity[blockOpened name='generate-cfn']"
"${ROOT_DIR}/scripts/generate-cfn.sh"
echo "##teamcity[blockClosed name='generate-cfn']"

echo "##teamcity[compilationStarted compiler='riffraff']"
npx @guardian/node-riffraff-artifact
echo "##teamcity[compilationFinished compiler='riffraff']"

