#!/usr/bin/env node
import "source-map-support/register";
import { CdkStack } from "../lib/cdk-stack";
import { App } from "@aws-cdk/core";

const app = new App();
new CdkStack(app, "TagJanitor");
