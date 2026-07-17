// Proxies LegiScan API requests so the API key stays server-side.
// Set LEGISCAN_API_KEY in the Netlify environment (or in .env for `netlify dev`).

const LEGISCAN_BASE_URL = 'https://api.legiscan.com';

// Operations the app actually uses; anything else is rejected.
const ALLOWED_OPS = new Set([
  'getSessionList',
  'getMasterList',
  'getBill',
  'getBillText',
  'getSessionPeople',
  'getSponsoredList',
  'getRollCall',
  'search',
]);

// Best-effort abuse guard: this URL is public once deployed, so without any
// limit a script that discovers it could hammer LegiScan directly and burn
// the monthly quota, bypassing all of the app's own caching. State lives in
// the function instance's memory (reset on cold start, not shared across
// instances), so this stops a tight hammering loop within one instance's
// lifetime rather than a patient, distributed, slow-drip attack — that would
// need a persistent store (e.g. Netlify Blobs) to fix properly.
// The window is generous enough that the app's own concurrent bursts (a
// handful of workers fetching bill/roll-call details in parallel) never trip it.
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_REQUESTS = 200;
const requestLog = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(clientId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  timestamps.push(now);
  requestLog.set(clientId, timestamps);

  // Bound memory for a long-lived warm instance seeing many distinct IPs.
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
      { status: 'ERROR', alert: { message: 'Too many requests. Please slow down.' } },
      { status: 429, headers: { 'Retry-After': '10' } },
    );
  }

  const apiKey = process.env.LEGISCAN_API_KEY;
  if (!apiKey) {
    return Response.json(
      { status: 'ERROR', alert: { message: 'LEGISCAN_API_KEY is not configured on the server.' } },
      { status: 500 },
    );
  }

  const incoming = new URL(req.url);
  const op = incoming.searchParams.get('op') ?? '';
  if (!ALLOWED_OPS.has(op)) {
    return Response.json(
      { status: 'ERROR', alert: { message: `Unsupported operation: ${op}` } },
      { status: 400 },
    );
  }

  const upstream = new URL(`${LEGISCAN_BASE_URL}/`);
  for (const [key, value] of incoming.searchParams) {
    if (key !== 'key') upstream.searchParams.set(key, value);
  }
  upstream.searchParams.set('key', apiKey);

  const response = await fetch(upstream);
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
