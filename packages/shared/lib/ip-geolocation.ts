interface IpApiCoResponse {
  ip?: string;
  city?: string;
  region?: string;
  region_code?: string;
  country_name?: string;
  country_code?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  org?: string;
  asn?: string;
  error?: boolean;
  reason?: string;
}

export interface IpGeolocationMetadata {
  source: "ipapi.co";
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  postalCode: string | null;
  timezone: string | null;
  asn: number | null;
  organization: string | null;
  isp: string | null;
}

function parseAsn(asn: string | undefined): number | null {
  if (!asn) return null;
  const normalized = asn.toUpperCase().startsWith("AS") ? asn.slice(2) : asn;
  const value = Number.parseInt(normalized, 10);
  return Number.isFinite(value) ? value : null;
}

export function normalizeClientIp(input: string | null | undefined): string | null {
  if (!input) return null;

  let ip = input.trim();
  if (!ip || ip.toLowerCase() === "unknown") return null;

  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  }

  const ipv4PortMatch = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4PortMatch) {
    ip = ipv4PortMatch[1];
  }

  return ip;
}

export function isPrivateOrLocalIp(input: string | null | undefined): boolean {
  if (!input) return true;
  const ip = input.trim().toLowerCase();

  if (!ip) return true;
  if (ip === "localhost" || ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;

  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) return false;

  const octets = ipv4Match.slice(1).map((value) => Number(value));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) return true;

  const [a, b] = octets;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

export async function lookupIpGeolocation(
  input: string | null | undefined
): Promise<IpGeolocationMetadata | null> {
  const ip = normalizeClientIp(input);
  if (!ip || isPrivateOrLocalIp(ip)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "qr-finder-server/1.0"
      }
    });

    if (!response.ok) return null;

    const data = (await response.json()) as IpApiCoResponse;
    if (data?.error) return null;

    return {
      source: "ipapi.co",
      ip: ip,
      country: data.country_name ?? null,
      region: data.region ?? null,
      city: data.city ?? null,
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
      postalCode: data.postal ?? null,
      timezone: data.timezone ?? null,
      asn: parseAsn(data.asn),
      organization: data.org ?? null,
      isp: data.org ?? null
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
