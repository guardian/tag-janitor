import axios from "axios";
import {
  Anghammarad,
  NotifyParams,
  RequestedChannel,
} from "@guardian/anghammarad";
import { Accounts, PrismInstancesResponse } from "./interfaces";
require("dotenv").config();

const getTopicArn = (): string => {
  const arn = process.env.TOPIC_ARN;
  if (!arn) {
    throw new Error("No Topic ARN in env");
  }
  return arn;
};

export const handler = async () => {
  const response = await axios.get(`https://prism.gutools.co.uk/instances`);

  const data: PrismInstancesResponse = response.data;
  const { instances } = data.data;
  const missingTagInstances = instances.filter(
    (i) => !i.tags["Stack"] || !i.tags["Stage"] || !i.tags["App"]
  );

  const accounts: Accounts = {};
  missingTagInstances.forEach((i) => {
    const { accountNumber } = i.meta.origin;
    accounts[accountNumber]
      ? accounts[accountNumber].push(i)
      : (accounts[accountNumber] = [i]);
  });
  console.log(`Found ${Object.keys(accounts)} accounts`);

  const anghammarad = new Anghammarad();

  for (const accountNumber of Object.keys(accounts)) {
    const instances = accounts[accountNumber];
    const { accountName } = instances[0].meta.origin;
    const instancesListString = instances
      .map((instance) => {
        const missingTags = ["App", "Stack", "Stage"]
          .filter((tag) => !instance.tags[tag])
          .join(", ");
        const s = missingTags.length > 1 ? "(s)" : "";
        return `* **[${instance.instanceName}](${instance.meta.href})** is missing tag${s} **${missingTags}**`;
      })
      .join("\n");

    const message = `Hello,
  
The AWS account ${accountNumber} (**${accountName}**) has ${instances.length} instances missing either Stack, Stage or App tags:

${instancesListString}

Please update your instances or Cloudformation to include the required tags.
`;

    const params: NotifyParams = {
      subject: `AWS account ${accountName} has instances with missing tags`,
      message: message,
      target: { Stack: "testing-node-client" },
      channel: RequestedChannel.HangoutsChat,
      topicArn: getTopicArn(),
      sourceSystem: "tag-janitor",
      actions: [],
    };

    console.log("params sent to anghamarrad", params);
    const angRes = await anghammarad.notify(params);
    console.log("anghammarad response", angRes);
  }
};

if (require.main === module) {
  (async function f() {
    await handler().catch((err) => console.error(err));
  })();
}
