import type { App } from "@aws-cdk/core";
import { CfnOutput } from "@aws-cdk/core";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack } from "@guardian/cdk/lib/constructs/core";
import { GuSSMParameter } from "./ssmParams";

export class CdkStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);

    const secrets = {
      test: new GuSSMParameter(this, "/CODE/test/tag-janitor/test-output"),
      test2: new GuSSMParameter(this, "/CODE/test/tag-janitor/test-output2"),
      test3: new GuSSMParameter(this, "/CODE/test/tag-janitor/test-output3"),
      test4: new GuSSMParameter(this, "/CODE/test/tag-janitor/test-output4"),
    };

    new CfnOutput(this, "output", { value: secrets.test.getValue() });
    new CfnOutput(this, "output2", { value: secrets.test2.getValue() });
    new CfnOutput(this, "output3", { value: secrets.test3.getValue() });
    new CfnOutput(this, "output4", { value: secrets.test4.getValue() });
    new CfnOutput(this, "output5", { value: secrets.test.getValue() });
  }
}
