// Proxies Census Bureau geocoder requests. The upstream is free and keyless
// but sends no CORS headers, so browsers can't call it directly — this proxy
// exists purely to give the web app same-origin access. Native builds call
// the Census API directly and never touch this.

const CENSUS_BASE_URL = 'https://geocoding.geo.census.gov/geocoder';

// Same best-effort abuse guard as the LegiScan proxy: in-memory, per warm
// instance — stops tight loops, not distributed attacks.
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const requestLog = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(clientId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  timestamps.push(now);
  requestLog.set(clientId, timestamps);
  if (requestLog.size > 500) {
    const oldestKey = requestLog.keys().next().value;
    if (oldestKey !== undefined) requestLog.delete(oldestKey);
  }
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

interface NetlifyFunctionContext {
  ip?: string;
}

export default async (req: Request, context: NetlifyFunctionContext): Promise<Response> => {
  const clientId = context.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'unknown';
  if (isRateLimited(clientId)) {
    return Response.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': '10' } },
    );
  }

  const incoming = new URL(req.url);
  const op = incoming.searchParams.get('op') ?? '';

  let upstream: URL;
  if (op === 'oneline') {
    const address = incoming.searchParams.get('address') ?? '';
    if (!address) return Response.json({ error: 'address is required' }, { status: 400 });
    upstream = new URL(`${CENSUS_BASE_URL}/locations/onelineaddress`);
    upstream.searchParams.set('address', address);
    upstream.searchParams.set('benchmark', 'Public_AR_Current');
    upstream.searchParams.set('format', 'json');
  } else if (op === 'district') {
    const lat = incoming.searchParams.get('lat') ?? '';
    const lng = incoming.searchParams.get('lng') ?? '';
    if (!lat || !lng) return Response.json({ error: 'lat and lng are required' }, { status: 400 });
    upstream = new URL(`${CENSUS_BASE_URL}/geographies/coordinates`);
    upstream.searchParams.set('x', lng);
    upstream.searchParams.set('y', lat);
    upstream.searchParams.set('benchmark', 'Public_AR_Current');
    upstream.searchParams.set('vintage', 'Current_Current');
    upstream.searchParams.set('layers', '54');
    upstream.searchParams.set('format', 'json');
  } else {
    return Response.json({ error: `Unsupported operation: ${op}` }, { status: 400 });
  }

  const response = await fetch(upstream);
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
