#!/usr/bin/env bash

set -e

npm ci
npm run lint
npm run test --workspaces
npm run synth --workspace=cdk
npm run compile --workspace=lambda
npm run build --workspace=lambda
npm run riffRaffUpload
