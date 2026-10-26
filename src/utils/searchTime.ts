// Exact RFC3339 timestamp-to-nanoseconds parser for the mock search API.
// This is not a VCP canonical timestamp or clock-attestation verifier.
//
// A JavaScript Date is used ONLY for whole UTC seconds (integer milliseconds
// representable exactly for four-digit years). The 1–9 fractional digits
// are parsed and added with bigint so they are never truncated or rounded.
const RFC3339_NANO =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|([+-])(\d{2}):(\d{2}))$/;

export function parseMockSearchTimestampNs(text: string): bigint | null {
  const match = RFC3339_NANO.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > lengths[month - 1]) return null;

  let offsetMinutes = 0;
  if (match[8] !== 'Z') {
    const offsetHours = Number(match[10]);
    const offsetMins = Number(match[11]);
    if (offsetHours > 23 || offsetMins > 59) return null;
    offsetMinutes = (offsetHours * 60 + offsetMins) * (match[9] === '+' ? 1 : -1);
  }

  const utc = new Date(0);
  // setUTCFullYear (unlike Date.UTC) correctly handles years 0000..0099.
  utc.setUTCFullYear(year, month - 1, day);
  utc.setUTCHours(hour, minute, second, 0);
  const utcWholeMs = utc.getTime() - offsetMinutes * 60000;
  if (!Number.isSafeInteger(utcWholeMs)) return null;

  const fractionNs = BigInt((match[7] ?? '').padEnd(9, '0'));
  return BigInt(utcWholeMs) * 1000000n + fractionNs;
}
