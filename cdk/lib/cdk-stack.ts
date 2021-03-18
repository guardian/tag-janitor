import type { App } from "@aws-cdk/core";
import { CfnOutput } from "@aws-cdk/core";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack } from "@guardian/cdk/lib/constructs/core";
import { GuSSMDefaultParam, GuSSMParameter } from "./ssmParams";

export class CdkStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);

    const secrets = {
      test1: new GuSSMParameter(this, "/CODE/test/tag-janitor/test-output").getValue(),
      test2: new GuSSMParameter(this, "/CODE/test/tag-janitor/test-output2").getValue(),
      usingDefaultValues: GuSSMDefaultParam(this, "test-output3").getValue(),
      usingTokensInPath: new GuSSMParameter(this, `/${this.stage}/${this.stack}/${this.app}/test-output4`).getValue(),
    };

    new CfnOutput(this, "output1", { value: secrets.test1 });
    new CfnOutput(this, "output2", { value: secrets.test2 });
    new CfnOutput(this, "usingDefaultValues", { value: secrets.usingDefaultValues });
    new CfnOutput(this, "usingTokensInPath", { value: secrets.usingTokensInPath });
  }
}
