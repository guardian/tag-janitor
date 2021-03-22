#!/usr/bin/env node
import "source-map-support/register";
import { App } from "@aws-cdk/aws-events/node_modules/@aws-cdk/core/lib/app";
import { CdkStack } from "../lib/cdk-stack";

const app = new App();
new CdkStack(app, "CdkStack", { stack: "deploy" });
