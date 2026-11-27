import { parseMockSearchTimestampNs } from '../utils/searchTime';

function fixtureTimestamp(iso: string) {
  const nanoseconds = parseMockSearchTimestampNs(iso);
  if (nanoseconds === null) throw new Error(`Invalid mock event timestamp: ${iso}`);
  return { timestamp_iso: iso, timestamp_int: nanoseconds.toString() };
}

export const orderTime = fixtureTimestamp('2025-11-24T14:02:05.123456789Z');
export const rejectionTime = fixtureTimestamp('2025-11-24T14:02:05.223456789Z');
export const executionTime = fixtureTimestamp('2025-11-24T14:02:05.323456789Z');
