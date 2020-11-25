import { generateMessage, getFormattedInstanceList } from "../src/handler";
import { Instance } from "../src/interfaces";

describe("handler", function () {
  describe("generateMessage", function () {
    it("should return a list of instances with missing tags", function () {
      const instances: Partial<Instance>[] = [
        instance("instance1", {
          app: "app1",
          stack: "stack1",
          href: "href1",
          type: "t3.large",
        }),
        instance("instance2", {
          app: "app2",
          stack: "stack2",
          href: "href2",
          type: "m2.micro",
        }),
      ];

      const instanceList = getFormattedInstanceList(instances as Instance[]);

      const result = generateMessage({
        accountName: "account1",
        accountNumber: "1111",
        instances: [],
        formattedInstanceList: instanceList,
      });

      expect(result).toEqual(`Hello,

The AWS account 1111 (**account1**) has 0 instances missing either Stack, Stage or App tags:

* **[instance1](href1)** (t3.large, App: app1, Stack: stack1) is missing tag(s) **Stage**
* **[instance2](href2)** (m2.micro, App: app2, Stack: stack2) is missing tag(s) **Stage**

Please update your instances or Cloudformation to include the required tags.
`);
    });

    describe("getFormattedInstanceList", function () {
      it("should return an empty string if given no instances", function () {
        expect(getFormattedInstanceList([])).toEqual("");
      });

      it("should create bullet-point lists of instances with missing tags", function () {
        const instances = [
          instance("instance1", {
            href: "href1",
            type: "t3.large",
            app: "app1",
            stack: "stack1",
          }),
        ];
        const result = getFormattedInstanceList(instances as Instance[]);
        expect(result).toEqual(
          "* **[instance1](href1)** (t3.large, App: app1, Stack: stack1) is missing tag(s) **Stage**"
        );
      });

      it("should optionally render present tags depending on which ones are missing", function () {
        const instances = [
          instance("instance1", {
            href: "href1",
            type: "t3.large",
          }),
          instance("instance2", {
            app: "app2",
            href: "href2",
            type: "m2.micro",
          }),
          instance("instance3", {
            app: "app3",
            stack: "stack3",
            href: "href3",
            type: "m2.micro",
          }),
        ];
        const result = getFormattedInstanceList(instances as Instance[]);

        expect(result).toEqual(
          `* **[instance1](href1)** (t3.large) is missing tag(s) **App, Stack, Stage**
* **[instance2](href2)** (m2.micro, App: app2) is missing tag(s) **Stack, Stage**
* **[instance3](href3)** (m2.micro, App: app3, Stack: stack3) is missing tag(s) **Stage**`
        );
      });
    });
  });
});

function instance(
  name: string,
  tags: {
    app?: string;
    stack?: string;
    stage?: string;
    href: string;
    type: string;
  },
  props?: Instance
): Partial<Instance> {
  return {
    vendorState: "",
    instanceName: name,
    tags: {
      ...(tags.app && { App: tags?.app }),
      ...(tags.stack && { Stack: tags?.stack }),
      ...(tags.stage && { Stage: tags?.stage }),
    },
    specification: {
      instanceType: tags.type,
      imageId: "",
      imageArn: "",
      vpcId: "",
    },
    meta: {
      href: tags.href,
      origin: {
        accountNumber: "",
        accountName: "",
        ownerId: "",
        region: "",
      },
    },
    ...props,
  };
}
