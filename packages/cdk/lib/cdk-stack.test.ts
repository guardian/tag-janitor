import { SynthUtils } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { CdkStack } from './cdk-stack';

describe('The tag-janitor stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const stack = new CdkStack(app, 'tag-janitor', {
			stack: 'deploy',
			stage: 'PROD',
		});

		expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
	});
});
