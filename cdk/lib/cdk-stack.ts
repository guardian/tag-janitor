import { Schedule } from "@aws-cdk/aws-events";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { Runtime } from "@aws-cdk/aws-lambda";
import type { App } from "@aws-cdk/core";
import { Duration } from "@aws-cdk/core";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack, GuStringParameter, GuSubnetListParameter, GuVpcParameter } from "@guardian/cdk/lib/constructs/core";
import { GuVpc } from "@guardian/cdk/lib/constructs/ec2";
import { GuScheduledLambda } from "@guardian/cdk/lib/patterns/scheduled-lambda";

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
      vpc: new GuVpcParameter(this, "vpcId", {
        description: "The VPC ID for the lambda to live in (this allows it to talk to Prism)",
      }), // TODO: Look this up in SSM https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html#aws-ssm-parameter-types
      subnets: new GuSubnetListParameter(this, "subnetIds", {
        description: "The subnet IDs for the lambda to live in (this allows it to talk to Prism)",
      }), // TODO: Look this up in SSM https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html#aws-ssm-parameter-types
      accountsAllowList: new GuStringParameter(this, "accountsAllowList", {
        description: "A comma separated list of account numbers to include",
      }),
      prismUrl: new GuStringParameter(this, "prismUrl", {
        description: "Base URL for Prism",
      }),
    };

    const lambdaFrequency = Duration.days(7);

    const tagJanitorLambda = new GuScheduledLambda(this, `${this.app}-lambda`, {
      handler: "dist/handler.handler",
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
      timeout: Duration.seconds(30),
      memorySize: 512,
      vpc: GuVpc.fromId(this, "vpc", { vpcId: parameters.vpc.valueAsString }),
      vpcSubnets: {
        subnets: GuVpc.subnets(this, parameters.subnets.valueAsList),
      },
      schedule: Schedule.rate(lambdaFrequency),
      monitoringConfiguration: { noMonitoring: true },
    });

    tagJanitorLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ["SNS:Publish"],
        resources: [parameters.topic.valueAsString],
      })
    );
  }
}
