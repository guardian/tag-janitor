import { Subnet, Vpc } from "@aws-cdk/aws-ec2";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { Code, Function, Runtime } from "@aws-cdk/aws-lambda";
import { Bucket } from "@aws-cdk/aws-s3";
import type { Construct, StackProps } from "@aws-cdk/core";
import { CfnParameter, Duration, Stack } from "@aws-cdk/core";

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucketName = new CfnParameter(this, "BucketName", {
      type: "String",
      description: "BucketName",
    });

    const app = "tag-janitor";

    const stackParameter = new CfnParameter(this, "stack", {
      type: "String",
      description: "Stack",
    });

    const stageParameter = new CfnParameter(this, "stage", {
      type: "String",
      description: "Stage",
    });

    const topicParameter = new CfnParameter(this, "topicArn", {
      type: "String",
      description: "The ARN of the SNS topic to send messages to",
    });

    const vpcParameter = new CfnParameter(this, "vpcId", {
      type: "AWS::EC2::VPC::Id",
      description:
        "The VPC ID for the lambda to live in (this allows it to talk to Prism)",
    }); // TODO: Look this up in SSM https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html#aws-ssm-parameter-types

    const subnetsParameter = new CfnParameter(this, "subnetIds", {
      type: "List<AWS::EC2::Subnet::Id>",
      description:
        "The subnet IDs for the lambda to live in (this allows it to talk to Prism)",
    }); // TODO: Look this up in SSM https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html#aws-ssm-parameter-types

    const accountsAllowListParameter = new CfnParameter(
      this,
      "accountsAllowList",
      {
        type: "String",
        description: "A comma separated list of account numbers to include",
      }
    );

    const prismUrl = new CfnParameter(this, "prismUrl", {
      type: "String",
      description: "Base URL for Prism",
    });

    const deployBucket = Bucket.fromBucketName(
      this,
      "DeployBucket",
      bucketName.valueAsString
    );

    const subnets = subnetsParameter.valueAsList.map((subnetId) =>
      Subnet.fromSubnetId(this, `subnet-${subnetId}`, subnetId)
    );

    const vpc = Vpc.fromVpcAttributes(this, "vpc", {
      vpcId: vpcParameter.valueAsString,
      availabilityZones: this.availabilityZones,
    });

    const tagJanitorLambda = new Function(this, `${app}-lambda`, {
      handler: "dist/handler.handler",
      functionName: `${app}-${stageParameter.valueAsString}`,
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromBucket(
        deployBucket,
        `${stackParameter.valueAsString}/${stageParameter.valueAsString}/${app}/${app}.zip`
      ),
      environment: {
        STAGE: stageParameter.valueAsString,
        TOPIC_ARN: topicParameter.valueAsString,
        ACCOUNTS_ALLOW_LIST: accountsAllowListParameter.valueAsString,
        PRISM_URL: prismUrl.valueAsString,
      },
      description: "Lambda to notify about instances with missing tags",
      timeout: Duration.seconds(30),
      memorySize: 512,
      vpc: vpc,
      vpcSubnets: {
        subnets: subnets,
      },
    });

    const frequency = Duration.days(7);
    const schedule = Schedule.rate(frequency);
    const target = new LambdaFunction(tagJanitorLambda);
    new Rule(this, "rule", {
      schedule: schedule,
      targets: [target],
      description: `Run tag-janitor every ${frequency.toHumanString()}`,
      enabled: true,
    });

    const snsPolicyStatement = new PolicyStatement();
    snsPolicyStatement.addActions("SNS:Publish");
    snsPolicyStatement.addResources(topicParameter.valueAsString);

    tagJanitorLambda.addToRolePolicy(snsPolicyStatement);
  }
}
