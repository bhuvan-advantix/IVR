import { getServerEnv } from "./env";

type ConnectCallInput = {
  from: string;
  callerId: string;
  flowUrl?: string;
  to?: string;
  statusCallback?: string;
  customField?: string;
};

export type ExotelConnectResult = {
  callSid?: string;
  status?: string;
  raw: unknown;
};

function pickString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getCallField(payload: unknown, field: string) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const root = payload as Record<string, unknown>;
  const call = root.Call;
  if (call && typeof call === "object") {
    return pickString((call as Record<string, unknown>)[field]);
  }

  return pickString(root[field]);
}

export async function connectExotelCall(input: ConnectCallInput): Promise<ExotelConnectResult> {
  const env = getServerEnv();
  const endpoint = `https://${env.EXOTEL_SUBDOMAIN}/v1/Accounts/${env.EXOTEL_ACCOUNT_SID}/Calls/connect.json`;
  const body = new URLSearchParams();

  body.set("From", input.from);
  body.set("CallerId", input.callerId);

  if (input.to) {
    body.set("To", input.to);
  }

  if (input.flowUrl) {
    body.set("Url", input.flowUrl);
  }

  if (input.statusCallback) {
    body.set("StatusCallback", input.statusCallback);
  }

  if (input.customField) {
    body.set("CustomField", input.customField);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.EXOTEL_API_KEY}:${env.EXOTEL_API_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();
  let raw: unknown = text;

  try {
    raw = JSON.parse(text);
  } catch {
    raw = { body: text };
  }

  if (!response.ok) {
    throw new Error(`Exotel call failed with HTTP ${response.status}: ${text}`);
  }

  return {
    callSid: getCallField(raw, "Sid"),
    status: getCallField(raw, "Status"),
    raw,
  };
}
