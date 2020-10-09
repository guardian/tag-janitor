export interface Accounts {
  [accountNumber: string]: Instance[];
}

export interface Instance {
  [data: string]: any;
  tags: {
    [key: string]: string;
  };
  arn: string;
  name: string;
  vendorState: string;
  group: string;
  dnsName: string;
  ip: string;
  addresses: { public: any[]; private: any[] };
  createdAt: string;
  instanceName: string;
  region: string;
  vendor: string;
  securityGroups: string[];
  app: string[];
  stack: string;
  stage: string;
  mainclasses: [];
  management: [[Object]];
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
