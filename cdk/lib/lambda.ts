import { request } from "https";
import { parse } from "url";
import type { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import AWS from "aws-sdk";
import type { CustomResourceGetParameterProps } from "./ssmParams";

export function flatten(object: object): Record<string, never> {
  return Object.assign(
    {},
    ...(function _flatten(child: any, path: string[] = []): any {
      return [].concat(
        ...Object.keys(child).map((key) => {
          const childKey = Buffer.isBuffer(child[key]) ? child[key].toString("utf8") : child[key];
          return typeof childKey === "object" && childKey !== null
            ? _flatten(childKey, path.concat([key]))
            : { [path.concat([key]).join(".")]: childKey };
        })
      );
    })(object)
  );
}

export async function handler(event: CloudFormationCustomResourceEvent, context: Context) {
  try {
    console.log(JSON.stringify(event));

    // Default physical resource id
    let physicalResourceId: string;
    switch (event.RequestType) {
      case "Create":
        physicalResourceId = event.LogicalResourceId;
        break;
      case "Update":
        physicalResourceId = event.PhysicalResourceId;
        break;
      case "Delete":
        await respond("SUCCESS", "OK", event.PhysicalResourceId, {});
        return;
    }

    let data: Record<string, string> = {};

    const getParamsProps = event.ResourceProperties.getParamsProps as string | undefined;

    if (getParamsProps) {
      const request = decodeCall(getParamsProps);
      const ssmClient = new AWS.SSM();
      const response = await ssmClient.getParameter(request.apiRequest).promise();
      console.log("Response:", JSON.stringify(response, null, 4));
      data = { ...flatten(response) };
    }

    console.log("data: ", data);
    await respond("SUCCESS", "OK", physicalResourceId, data);
  } catch (e) {
    console.log(e);
    await respond("FAILED", e.message || "Internal Error", context.logStreamName, {});
  }

  function respond(responseStatus: string, reason: string, physicalResourceId: string, data: Record<string, string>) {
    const responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: reason,
      PhysicalResourceId: physicalResourceId,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      NoEcho: false,
      Data: data,
    });

    console.log("Responding", responseBody);
    const parsedUrl = parse(event.ResponseURL);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: "PUT",
      headers: { "content-type": "", "content-length": responseBody.length },
    };

    return new Promise((resolve, reject) => {
      try {
        const r = request(requestOptions, resolve);
        r.on("error", reject);
        r.write(responseBody);
        r.end();
      } catch (e) {
        reject(e);
      }
    });
  }
}

function decodeCall(call: string): CustomResourceGetParameterProps {
  return JSON.parse(call) as CustomResourceGetParameterProps;
}
