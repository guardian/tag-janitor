import { request } from "https";
import { parse } from "url";
import type { CloudFormationCustomResourceEvent, Context } from "aws-lambda";
import type { Parameter } from "aws-sdk/clients/ssm";
import type { CustomResourceGetParameterProps } from "./ssmParams";

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
    console.log("getParamsProps", getParamsProps);

    // if (getParamsProps) {
    //   const request = decodeCall(getParamsProps);
    const ssmClient = new AWS.SSM();
    const response = await ssmClient.getParameter(request.apiRequest).promise();
    //   console.log("Response:", JSON.stringify(response, null, 4));
    //   data = { response: JSON.stringify(response.Parameter) };
    // }

    const parameter: Parameter = {};
    data = { response: JSON.stringify(parameter) };
    // await respond("SUCCESS", "OK", physicalResourceId, data);
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
