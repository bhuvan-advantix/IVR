import { normalizeIndianPhoneForE164 } from "./phone";

type ConnectPayload = {
  [key: string]: string;
};

export function getIncomingCustomerPhone(payload: ConnectPayload) {
  const rawPhone =
    payload.From ||
    payload.CallFrom ||
    payload.Caller ||
    payload.caller ||
    payload.from ||
    payload.call_from ||
    "";

  return normalizeIndianPhoneForE164(rawPhone);
}

function speakablePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits.split("").join(" ");
}

export function exotelConnectResponse(destinationPhone: string, payload: ConnectPayload = {}) {
  const customerPhone = getIncomingCustomerPhone(payload);
  const spokenCustomerPhone = speakablePhone(customerPhone);
  const response: Record<string, unknown> = {
    fetch_after_attempt: false,
    destination: {
      numbers: [normalizeIndianPhoneForE164(destinationPhone)],
    },
    record: true,
    recording_channels: "dual",
    max_ringing_duration: 45,
    max_conversation_duration: 3600,
  };

  if (spokenCustomerPhone) {
    response.start_call_playback = {
      playback_to: "callee",
      type: "text",
      value: `Customer number is ${spokenCustomerPhone}. Connecting the call now.`,
    };
  }

  return response;
}
