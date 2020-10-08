import axios, { AxiosResponse } from "axios";

interface Instance {
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
    origin: [Object];
  };
}

interface PrismInstancesResponse {
  data: {
    instances: Instance[];
  };
}

export const handler = async (event?, context?) => {
  const response = await axios.get(`https://prism.gutools.co.uk/instances`);

  const data: PrismInstancesResponse = response.data;
  const { instances } = data.data;
  const missingTagInstances = instances.filter(
    (i) => !i.tags["Stack"] || !i.tags["Stage"] || !i.tags["App"]
  );
};

(async function f() {
  await handler();
})();
