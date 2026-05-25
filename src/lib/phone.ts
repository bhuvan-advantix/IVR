export function normalizeIndianPhoneForE164(phone: string) {
  const trimmed = phone.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("sip:")) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return trimmed;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  return trimmed;
}
