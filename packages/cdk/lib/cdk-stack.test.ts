import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkStack } from './cdk-stack';

describe('The tag-janitor stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const stack = new CdkStack(app, 'tag-janitor', {
			stack: 'deploy',
			stage: 'PROD',
		});

		expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
	});
});
