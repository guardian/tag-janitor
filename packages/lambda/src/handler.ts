import type { NotifyParams } from '@guardian/anghammarad';
import { Anghammarad, RequestedChannel } from '@guardian/anghammarad';
import axios from 'axios';
import * as dotenv from 'dotenv';
import type { Accounts, Instance, PrismInstancesResponse } from './interfaces';

dotenv.config();

const getTopicArn = (): string => {
	const arn = process.env.TOPIC_ARN;
	if (!arn) {
		throw new Error('No Topic ARN in env');
	}
	return arn;
};

function createNotifyParams({
	accountName,
	message,
	accountNumber,
	topicArn,
}: {
	accountName: string;
	message: string;
	accountNumber: string;
	topicArn: string;
}) {
	return {
		subject: `AWS account ${accountName} has instances with missing tags`,
		message: message,
		target: { AwsAccount: accountNumber },
		channel: RequestedChannel.Email,
		topicArn: topicArn,
		sourceSystem: 'tag-janitor',
		actions: [],
	};
}

async function getInstancesWithMissingTags(): Promise<Instance[]> {
	const prismUrl: string | undefined = process.env.PRISM_URL;

	if (!prismUrl) {
		throw new Error('PRISM_URL env var not found.');
	}

	const prismResponse = await axios.get<PrismInstancesResponse>(
		`${prismUrl}/instances`,
	);
	const data: PrismInstancesResponse = prismResponse.data;
	return data.data.instances.filter(
		(i) => !i.tags['Stack'] || !i.tags['Stage'] || !i.tags['App'],
	);
}

function groupInstancesWithAccounts({
	instancesWithMissingTags,
	pAndEAccounts,
}: {
	instancesWithMissingTags: Instance[];
	pAndEAccounts?: string[];
}): Accounts {
	return instancesWithMissingTags
		.filter((instance) =>
			pAndEAccounts?.includes(instance.meta.origin.accountNumber),
		)
		.reduce<Accounts>((acc, instance) => {
			const { accountNumber } = instance.meta.origin;
			const current = acc[accountNumber] ?? [];
			return {
				...acc,
				[accountNumber]: [...current, instance],
			};
		}, {});
}

export function getFormattedInstanceList(instances: Instance[]) {
	const tags = ['App', 'Stack', 'Stage'];

	return instances
		.map((instance) => {
			const missingTags = tags.filter((tag) => !instance.tags[tag]).join(', ');
			const presentTags = tags
				.filter((tag) => !missingTags.includes(tag))
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- TODO fix this!
				.map((tag) => `${tag}: ${instance.tags[tag]}`)
				.join(', ');
			const s = missingTags.length > 1 ? '(s)' : '';
			const hyperlinkInstanceName = `[${instance.instanceName}](${instance.meta.href})`;
			const additionalInfo = [
				instance.specification.instanceType,
				...(presentTags ? [presentTags] : []),
			].join(', ');
			return `* **${hyperlinkInstanceName}** (${additionalInfo}) is missing tag${s} **${missingTags}**`;
		})
		.join('\n');
}

export function generateMessage({
	accountName,
	accountNumber,
	instances,
	formattedInstanceList,
}: {
	accountNumber: string;
	accountName: string;
	instances: Instance[];
	formattedInstanceList: string;
}): string {
	return `Hello,

The AWS account ${accountNumber} (**${accountName}**) has ${instances.length} instances missing either Stack, Stage or App tags:

${formattedInstanceList}

Please update your instances or Cloudformation to include the required tags.
`;
}

export const handler = async () => {
	const anghammarad = new Anghammarad();
	const topicArn = getTopicArn();
	const pAndEAccounts = process.env.ACCOUNTS_ALLOW_LIST?.split(',');

	const instancesWithMissingTags = await getInstancesWithMissingTags();
	const accounts: Accounts = groupInstancesWithAccounts({
		instancesWithMissingTags,
		pAndEAccounts,
	});

	console.log(
		`Found ${
			Object.keys(accounts).length
		} allowed accounts with invalid instances:\n${Object.keys(accounts).join(
			', ',
		)}`,
	);

	for (const accountNumber of Object.keys(accounts)) {
		const instances = accounts[accountNumber] ?? [];

		if (instances.length === 0) {
			break;
		}

		// @ts-expect-error -- TODO fix this!
		const { accountName } = instances[0].meta.origin;
		const formattedInstanceList = getFormattedInstanceList(instances);
		const message = generateMessage({
			accountNumber,
			accountName,
			instances,
			formattedInstanceList,
		});

		const params: NotifyParams = createNotifyParams({
			accountName,
			message,
			topicArn,
			accountNumber,
		});

		console.log('Notifying Anghamarrad with params', params);
		const angRes = await anghammarad.notify(params);
		console.log('Anghammarad response', angRes);
	}
};

if (require.main === module) {
	(async function f() {
		await handler().catch((err) => console.error(err));
	})()
		.then(() => console.log('Done'))
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}
