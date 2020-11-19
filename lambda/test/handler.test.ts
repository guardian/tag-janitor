import { generateMessage, getFormattedInstanceList } from "../src/handler";
import { Instance } from "../src/interfaces";

describe("handler", function () {
  describe("generateMessage", function () {
    it("should return a list of instances with missing tags", function () {
      const instanceList = getFormattedInstanceList(([
        {
          tags: { App: "app1", Stack: "stack1" },
          instanceName: "instance1",
          meta: { href: "href1" },
        },
        {
          tags: { App: "app2", Stack: "stack2" },
          instanceName: "instance2",
          meta: { href: "href2" },
        },
      ] as unknown) as Instance[]);

      const result = generateMessage({
        accountName: "account1",
        accountNumber: "1111",
        instances: [],
        formattedInstanceList: instanceList,
      });

      expect(result).toEqual(`Hello,

The AWS account 1111 (**account1**) has 0 instances missing either Stack, Stage or App tags:

* **[instance1](href1)** (App: app1, Stack: stack1) is missing tag(s) **Stage**
* **[instance2](href2)** (App: app2, Stack: stack2) is missing tag(s) **Stage**

Please update your instances or Cloudformation to include the required tags.
`);
    });

    describe("getFormattedInstanceList", function () {
      it("should return an empty string if given no instances", function () {
        expect(getFormattedInstanceList([])).toEqual("");
      });

      it("should create bullet-point lists of instances with missing tags", function () {
        const instances = [
          {
            tags: { App: "app1", Stack: "stack1" },
            instanceName: "instance1",
            meta: { href: "href1" },
          },
        ];
        const result = getFormattedInstanceList(
          (instances as unknown) as Instance[]
        );
        expect(result).toEqual(
          "* **[instance1](href1)** (App: app1, Stack: stack1) is missing tag(s) **Stage**"
        );
      });

      it("should optionally render present tags depending on which ones are missing", function () {
        const instances = [
          {
            tags: {},
            instanceName: "instance1",
            meta: { href: "href1" },
          },
          {
            tags: { App: "app2" },
            instanceName: "instance2",
            meta: { href: "href2" },
          },
          {
            tags: { App: "app3", Stack: "stack3" },
            instanceName: "instance3",
            meta: { href: "href3" },
          },
        ];
        const result = getFormattedInstanceList(
          (instances as unknown) as Instance[]
        );
        expect(result).toEqual(
          `* **[instance1](href1)** is missing tag(s) **App, Stack, Stage**
* **[instance2](href2)** (App: app2) is missing tag(s) **Stack, Stage**
* **[instance3](href3)** (App: app3, Stack: stack3) is missing tag(s) **Stage**`
        );
      });
    });
  });
});
