import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import { Subnet, Vpc } from "@aws-cdk/aws-ec2";

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

    const vpcParameter = new cdk.CfnParameter(this, "vpcId", {
      type: "AWS::EC2::VPC::Id",
      description:
        "The VPC ID for the lambda to live in (this allows it to talk to Prism)",
    }); // TODO: Look this up in SSM https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html#aws-ssm-parameter-types

    const subnetsParameter = new cdk.CfnParameter(this, "subnetIds", {
      type: "List<AWS::EC2::Subnet::Id>",
      description:
        "The subnet IDs for the lambda to live in (this allows it to talk to Prism)",
    }); // TODO: Look this up in SSM https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html#aws-ssm-parameter-types

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

    const subnets = subnetsParameter.valueAsList.map((subnetId) =>
      Subnet.fromSubnetId(this, `subnet-${subnetId}`, subnetId)
    );

    const vpc = Vpc.fromVpcAttributes(this, "vpc", {
      vpcId: vpcParameter.valueAsString,
      availabilityZones: this.availabilityZones,
    });

    const tagJanitorLambda = new lambda.Function(this, `${app}-lambda`, {
      handler: "dist/handler.handler",
      functionName: `${app}-${stageParameter.valueAsString}`,
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
      description: "Lambda to notify about instances with missing tags",
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc: vpc,
      vpcSubnets: {
        subnets: subnets,
      },
    });

    const snsPolicyStatment = new iam.PolicyStatement();
    snsPolicyStatment.addActions("SNS:Publish");
    snsPolicyStatment.addResources(topicParameter.valueAsString);

    tagJanitorLambda.addToRolePolicy(snsPolicyStatment);
  }
}
