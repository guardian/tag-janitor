import { readFileSync } from "fs";
import { join } from "path";
import type { IGrantable, IPrincipal } from "@aws-cdk/aws-iam";
import { Policy, PolicyStatement } from "@aws-cdk/aws-iam";
import { Code, Runtime, SingletonFunction } from "@aws-cdk/aws-lambda";
import type { Reference } from "@aws-cdk/core";
import { Construct, CustomResource, Duration } from "@aws-cdk/core";
import { AwsCustomResourcePolicy } from "@aws-cdk/custom-resources";
import type { GetParameterRequest } from "aws-sdk/clients/ssm";
import type { CdkStack } from "./cdk-stack";

interface GuSSMParameterProps {
  secure?: boolean;
  defaultPath: boolean;
}

export class GuSSMParameter extends Construct implements IGrantable {
  private readonly customResource: CustomResource;
  readonly grantPrincipal: IPrincipal;

  constructor(scope: CdkStack, param: string, props?: GuSSMParameterProps) {
    super(scope, `GuSSMParameter${param}`);
    const filePath = join(__dirname, "lambda.js"); //.replace("/lib/", "/dist/lib/");
    const provider = new SingletonFunction(scope, `${param}Provider`, {
      code: Code.fromInline(readFileSync(filePath).toString()),
      // runtime: new Runtime("nodejs14.x", RuntimeFamily.NODEJS, { supportsInlineCode: true }),
      runtime: Runtime.NODEJS_12_X,
      handler: "index.handler",
      uuid: "eda001a3-b7c8-469d-bc13-787c4e13cfd9",
      lambdaPurpose: "Lambda to fetch SSM parameters",
      timeout: Duration.minutes(2),
    });

    this.grantPrincipal = provider.grantPrincipal;

    const paramArn = `arn:aws:ssm:${scope.region}:${scope.account}:parameter/${param}`;

    const statements: PolicyStatement[] = [
      new PolicyStatement({
        actions: ["ssm:getParameter"],
        resources: AwsCustomResourcePolicy.ANY_RESOURCE, // TODO: Account for stack/stage vs fullPath
      }),
    ];

    const policy = new Policy(scope, `${param}CustomResourcePolicy`, {
      statements: statements,
    });

    if (provider.role !== undefined) {
      policy.attachToRole(provider.role);
    }

    const fullParamPath = `/${scope.stage}/${scope.stack}/${scope.app}/${param}`;

    const getParamsProps: CustomResourceGetParameterProps = {
      apiRequest: {
        Name: props?.defaultPath ? fullParamPath : param,
        WithDecryption: props?.secure,
      },
    };

    this.customResource = new CustomResource(this, `${param}Resource`, {
      resourceType: "Custom::GuGetSSMParameter",
      serviceToken: provider.functionArn,
      pascalCaseProperties: false,
      properties: {
        getParamsProps: JSON.stringify(getParamsProps),
      },
    });

    // If the policy was deleted first, then the function might lose permissions to delete the custom resource
    // This is here so that the policy doesn't get removed before onDelete is called
    this.customResource.node.addDependency(policy);
  }

  public getValueReference(): Reference {
    console.log(this.customResource.toString());
    return this.customResource.getAtt("Parameter.Value");
  }

  public getValue(): string {
    console.log(this.customResource.toString());
    return this.customResource.getAttString("Parameter.Value");
  }
}

export interface CustomResourceGetParameterProps {
  apiRequest: GetParameterRequest;
}

export function GuSSMParameter2(scope: CdkStack, param: string): string {
  return new GuSSMParameter(scope, param, { defaultPath: true }).getValue();
}
