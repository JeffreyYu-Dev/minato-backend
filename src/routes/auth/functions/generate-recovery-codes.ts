import { randomBytes } from "crypto";

function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(6);
    const hex = bytes.toString("hex").toUpperCase();
    const formatted = `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(
      8,
      12
    )}`;
    codes.push(formatted);
  }
  return codes;
}

export default generateRecoveryCodes;
