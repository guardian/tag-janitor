import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketName = new cdk.CfnParameter(this, "BucketName", {
      type: "String",
      description: "BucketName",
    });

    const app = "tag-janitor";

    const stackParameter = new cdk.CfnParameter(this, "stack", {
      type: "String",
      description: "Stack",
    });

    const stageParameter = new cdk.CfnParameter(this, "stage", {
      type: "String",
      description: "Stage",
    });

    const topicParameter = new cdk.CfnParameter(this, "topicArn", {
      type: "String",
      description: "The ARN of the SNS topic to send messages to",
    });

    const accountsAllowListParameter = new cdk.CfnParameter(
      this,
      "accountsAllowList",
      {
        type: "String",
        description: "A comma separated list of account numbers to include",
      }
    );

    const prismUrl = new cdk.CfnParameter(this, "prismUrl", {
      type: "String",
      description: "Base URL for Prism",
    });

    const deployBucket = s3.Bucket.fromBucketName(
      this,
      "DeployBucket",
      bucketName.valueAsString
    );

    const tagJanitorLambda = new lambda.Function(this, `${app}-lambda`, {
      functionName: `${app}-${stageParameter.valueAsString}`,
      handler: "dist/handler.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromBucket(
        deployBucket,
        `${stackParameter.valueAsString}/${stageParameter.valueAsString}/${app}/${app}.zip`
      ),
      environment: {
        STAGE: stageParameter.valueAsString,
        TOPIC_ARN: topicParameter.valueAsString,
        ACCOUNTS_ALLOW_LIST: accountsAllowListParameter.valueAsString,
        PRISM_URL: prismUrl.valueAsString,
      },
      description: "Lambda to notify about invalid instances",
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
    });

    const snsPolicyStatment = new iam.PolicyStatement();
    snsPolicyStatment.addActions("SNS:Publish");
    snsPolicyStatment.addResources(topicParameter.valueAsString);

    tagJanitorLambda.addToRolePolicy(snsPolicyStatment);
  }
}
