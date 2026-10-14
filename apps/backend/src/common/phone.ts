// Pakistan mobile numbers -> +923XXXXXXXXX. Returns null if invalid.
export function normalizePkPhone(input: string): string | null {
  let s = input.trim().replace(/[\s\-()]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  else if (s.startsWith('00')) s = s.slice(2);

  if (s.startsWith('92')) s = s.slice(2);
  else if (s.startsWith('0')) s = s.slice(1);

  return /^3\d{9}$/.test(s) ? `+92${s}` : null;
}