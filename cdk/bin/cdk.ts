#!/usr/bin/env node
import "source-map-support/register";
import { App } from "@aws-cdk/core";
import { CdkStack } from "../lib/cdk-stack";

const app = new App();
new CdkStack(app, "ssm-get-param-custom-resource-stack", {
  app: "tag-janitor",
  env: {
    region: "eu-west-1",
  },
});
