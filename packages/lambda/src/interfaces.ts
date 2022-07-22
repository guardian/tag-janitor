export type Accounts = Record<string, Instance[]>;

export interface Instance {
	[data: string]: unknown;
	tags: Record<string, string>;
	arn: string;
	name: string;
	vendorState: string;
	group: string;
	dnsName: string;
	ip: string;
	addresses: { public: unknown[]; private: unknown[] };
	createdAt: string;
	instanceName: string;
	region: string;
	vendor: string;
	securityGroups: string[];
	app: string[];
	stack: string;
	stage: string;
	mainclasses: [];
	management: Record<string, unknown>;
	specification: {
		imageId: string;
		imageArn: string;
		instanceType: string;
		vpcId: string;
	};
	meta: {
		href: string;
		origin: {
			accountNumber: string;
			accountName: string;
			ownerId: string;
			region: string;
		};
	};
}

export interface PrismInstancesResponse {
	data: {
		instances: Instance[];
	};
}
