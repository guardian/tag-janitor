import { Schedule } from "@aws-cdk/aws-events";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { InlineCode, Runtime, SingletonFunction } from "@aws-cdk/aws-lambda";
import { App, CustomResource, CustomResourceProvider } from "@aws-cdk/core";
import { Duration } from "@aws-cdk/core";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack, GuStringParameter } from "@guardian/cdk/lib/constructs/core";
import { GuVpc } from "@guardian/cdk/lib/constructs/ec2";
import { GuScheduledLambda } from "@guardian/cdk/lib/patterns/scheduled-lambda";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "@aws-cdk/custom-resources";
import { readFileSync } from "fs";

export class CdkStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);

    const parameters = {
      bucketName: new GuStringParameter(this, "BucketName", {
        description: "BucketName",
      }),
      topic: new GuStringParameter(this, "topicArn", {
        description: "The ARN of the SNS topic to send messages to",
      }),
      accountsAllowList: new GuStringParameter(this, "accountsAllowList", {
        description: "A comma separated list of account numbers to include",
      }),
      prismUrl: new GuStringParameter(this, "prismUrl", {
        description: "Base URL for Prism",
      }),
    };

    const lambdaFrequency = Duration.days(7);

    const tagJanitorLambda = new GuScheduledLambda(this, `${this.app}-lambda`, {
      handler: "dist/src/handler.handler",
      functionName: `${this.app}-${this.stage}`,
      runtime: Runtime.NODEJS_12_X,
      code: {
        bucket: parameters.bucketName.valueAsString,
        key: `${this.stack}/${this.stage}/${this.app}/${this.app}.zip`,
      },
      environment: {
        STAGE: this.stage,
        TOPIC_ARN: parameters.topic.valueAsString,
        ACCOUNTS_ALLOW_LIST: parameters.accountsAllowList.valueAsString,
        PRISM_URL: parameters.prismUrl.valueAsString,
      },
      description: "Lambda to notify about instances with missing tags",
      // This lambda needs access to the Deploy Tools VPC so that it can talk to Prism
      vpc: GuVpc.fromIdParameter(this, "vpc"),
      vpcSubnets: {
        subnets: GuVpc.subnetsfromParameter(this),
      },
      schedule: Schedule.rate(lambdaFrequency),
      monitoringConfiguration: {
        // snsTopicName: "devx-alerts",
        snsTopicName: GuSecret(this, "sns-topic"),
        toleratedErrorPercentage: 99,
      },
    });

    tagJanitorLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ["SNS:Publish"],
        resources: [parameters.topic.valueAsString],
      })
    );
  }
}

function GuSecret(scope: CdkStack, param: string): string {
  const fullParamPath = `/${scope.stage}/${scope.stack}/${scope.app}/${param}`;
  // const fullParamPath = `/PROD/deploy/tag-janitor/${param}`;
  const getParameter = new AwsCustomResource(scope, "GetParameter", {
    onUpdate: {
      // will also be called for a CREATE event
      service: "SSM",
      action: "getParameter",
      parameters: { Name: fullParamPath, WithDecryption: false },
      physicalResourceId: PhysicalResourceId.of(Date.now().toString()), // Update physical id to always fetch the latest version
    },
    policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
  });

  const resource = new CustomResource(scope, "Resource", {
    serviceToken: "",
    // provider: CustomResourceProvider.lambda(
    //   new SingletonFunction(scope, "Singleton", {
    //     uuid: "f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc",
    //     code: new InlineCode(readFileSync("custom-resource-handler.py", { encoding: "utf-8" })),
    //     handler: "index.main",
    //     timeout: Duration.seconds(300),
    //     runtime: Runtime.PYTHON_3_6,
    //   })
    // ),
    // properties: props,
  });

  return getParameter.getResponseField("Parameter.Value");
}
