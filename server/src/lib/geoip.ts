import { Reader, ReaderModel } from '@maxmind/geoip2-node';
import path from 'path';

let reader: ReaderModel | null = null;

const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
];

function isPrivateIP(ip: string): boolean {
  return PRIVATE_RANGES.some(re => re.test(ip));
}

export async function initGeoIP(dbPath?: string) {
  const resolvedPath = dbPath || path.join(process.cwd(), 'data', 'GeoLite2-City.mmdb');
  try {
    reader = await Reader.open(resolvedPath);
    console.log(`[GEOIP] Database loaded: ${resolvedPath}`);
  } catch (err) {
    console.warn('[GEOIP] Database not available, geo lookup disabled:', err);
    reader = null;
  }
}

export function lookupCountry(ip: string): string | null {
  if (!reader || !ip) return null;
  if (isPrivateIP(ip)) return 'LOCAL';
  try {
    const response = reader.city(ip);
    return response.country?.isoCode ?? null;
  } catch {
    return null;
  }
}

export function getGeoIPStatus(): { loaded: boolean; dbPath?: string; readerCount?: number } {
  return { loaded: reader !== null };
}
