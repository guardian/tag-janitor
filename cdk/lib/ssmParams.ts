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
  /*
   * Assumes the path of `/${STAGE}/${STACK}/${APP}/${param}`
   * */
  defaultPath: boolean;
}

const stripped = (str: string) => str.replace(/[-/]/g, "");

export class GuSSMParameter extends Construct implements IGrantable {
  private readonly customResource: CustomResource;
  readonly grantPrincipal: IPrincipal;

  constructor(scope: CdkStack, param: string, props?: GuSSMParameterProps) {
    const id = (id: string) =>
      param.toUpperCase().includes("TOKEN") ? `${id}-token-${Date.now()}` : `${id}-${stripped(param)}`;
    super(scope, id("GuSSMParameter"));
    const lambdaFilePath = join(__dirname, "lambda.js");
    const provider = new SingletonFunction(scope, id("Provider"), {
      code: Code.fromInline(readFileSync(lambdaFilePath).toString()),
      // runtime: new Runtime("nodejs14.x", RuntimeFamily.NODEJS, { supportsInlineCode: true }),
      runtime: Runtime.NODEJS_12_X,
      handler: "index.handler",
      uuid: "eda001a3-b7c8-469d-bc13-787c4e13cfd9",
      lambdaPurpose: "Lambda to fetch SSM parameters",
      timeout: Duration.minutes(2),
    });

    this.grantPrincipal = provider.grantPrincipal;

    const paramArn = `arn:aws:ssm:${scope.region}:${scope.account}:parameter/${param}`; // TODO: Find out actual ARN, because this results in a Access Denied error

    const statements: PolicyStatement[] = [
      new PolicyStatement({
        actions: ["ssm:getParameter"],
        resources: AwsCustomResourcePolicy.ANY_RESOURCE, // TODO: Account for stack/stage vs fullPath
      }),
    ];

    const policy = new Policy(scope, id("CustomResourcePolicy"), {
      statements: statements,
    });

    if (provider.role !== undefined) {
      policy.attachToRole(provider.role);
    }

    const fullParamPath = `/${scope.stage}/${scope.stack}/${scope.app}/${param}`;
    const fullParamName = props?.defaultPath ? fullParamPath : param;

    const getParamsProps: CustomResourceGetParameterProps = {
      apiRequest: { Name: fullParamName, WithDecryption: props?.secure },
    };

    this.customResource = new CustomResource(this, id("Resource"), {
      resourceType: "Custom::GuGetSSMParameter",
      serviceToken: provider.functionArn,
      pascalCaseProperties: false,
      properties: { getParamsProps: JSON.stringify(getParamsProps) },
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

export function GuSSMDefaultParam(scope: CdkStack, param: string): GuSSMParameter {
  return new GuSSMParameter(scope, param, { defaultPath: true });
}
