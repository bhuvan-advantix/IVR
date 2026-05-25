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

function normalizeIndianPhone(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return `0${digits.slice(2)}`;
  }

  if (digits.length === 10) {
    return `0${digits}`;
  }

  return trimmed;
}

export function normalizeExotelFlowUrl(flowUrl: string) {
  const env = getServerEnv();
  const trimmed = flowUrl.trim();

  if (!trimmed) {
    return "";
  }

  const appIdFromUrl = trimmed.match(/\/apps\/(\d+)/)?.[1];
  const appId = appIdFromUrl || env.EXOTEL_APP_ID;

  if (appId && (appIdFromUrl || trimmed.includes("/apps/"))) {
    return `https://my.exotel.com/${env.EXOTEL_ACCOUNT_SID}/exoml/start_voice/${appId}`;
  }

  return trimmed;
}

export async function connectExotelCall(input: ConnectCallInput): Promise<ExotelConnectResult> {
  const env = getServerEnv();
  const endpoint = `https://${env.EXOTEL_SUBDOMAIN}/v1/Accounts/${env.EXOTEL_ACCOUNT_SID}/Calls/connect.json`;
  const body = new URLSearchParams();

  body.set("From", normalizeIndianPhone(input.from));
  body.set("CallerId", normalizeIndianPhone(input.callerId));
  body.set("CallType", "trans");
  body.set("Record", env.EXOTEL_CALL_RECORDING_ENABLED ? "true" : "false");

  if (input.to) {
    body.set("To", normalizeIndianPhone(input.to));
  }

  if (input.flowUrl) {
    body.set("Url", normalizeExotelFlowUrl(input.flowUrl));
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
