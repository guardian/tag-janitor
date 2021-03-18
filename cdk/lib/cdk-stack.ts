import type { App } from "@aws-cdk/core";
import { CfnOutput } from "@aws-cdk/core";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack } from "@guardian/cdk/lib/constructs/core";
import { GuSSMDefaultParam, GuSSMParameter } from "./ssmParams";

export class CdkStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);

    const secrets = {
      fullPath: new GuSSMParameter(this, "/CODE/test/tag-janitor/test-output").getValue(),
      usingDefaultValues: GuSSMDefaultParam(this, "test-output").getValue(),
      usingTokensInPath: new GuSSMParameter(this, `/${this.stage}/${this.stack}/${this.app}/test-output`).getValue(),
    };

    new CfnOutput(this, "fullPath", { value: secrets.fullPath });
    new CfnOutput(this, "usingDefaultValues", { value: secrets.usingDefaultValues });
    new CfnOutput(this, "usingTokensInPath", { value: secrets.usingTokensInPath });
  }
}
