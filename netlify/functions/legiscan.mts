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
  'getRollCall',
  'search',
]);

export default async (req: Request): Promise<Response> => {
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
