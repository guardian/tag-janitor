import { Schedule } from "@aws-cdk/aws-events";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { Runtime } from "@aws-cdk/aws-lambda";
import type { App } from "@aws-cdk/core";
import { Duration } from "@aws-cdk/core";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack, GuStringParameter } from "@guardian/cdk/lib/constructs/core";
import { GuVpc } from "@guardian/cdk/lib/constructs/ec2";
import { GuScheduledLambda } from "@guardian/cdk/lib/patterns/scheduled-lambda";

export class CdkStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);

    const app = "tag-janitor";

    const parameters = {
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

    const tagJanitorLambda = new GuScheduledLambda(this, `${app}-lambda`, {
      app: app,
      handler: "dist/src/handler.handler",
      functionName: `${app}-${this.stage}`,
      runtime: Runtime.NODEJS_12_X,
      fileName: `${app}.zip`,
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
      rules: [{ schedule: Schedule.rate(lambdaFrequency) }],
      monitoringConfiguration: {
        alarmName: `High error % from ${app}-${this.stage}`,
        snsTopicName: "devx-alerts",
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
