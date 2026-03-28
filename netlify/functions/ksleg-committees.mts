import type { Context } from "@netlify/functions";

export default async (request: Request, _context: Context) => {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl || !targetUrl.includes("kslegislature.gov")) {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ committees: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const html = await res.text();

    const startMarker = "<!-- begin committee memberships -->";
    const endMarker = "<!-- end committee memberships -->";
    const start = html.indexOf(startMarker);
    const end = html.indexOf(endMarker);

    if (start < 0 || end < 0) {
      return new Response(JSON.stringify({ committees: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const section = html.slice(start, end);
    const linkPattern =
      /<a[^>]*href="(\/li\/[^"]*committees\/[^"]+)"[^>]*>([^<]+)<\/a>/g;

    const committees: {
      name: string;
      day: string;
      time: string;
      room: string;
      url: string;
    }[] = [];

    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(section)) !== null) {
      const url = `https://www.kslegislature.gov${match[1]}`;
      const raw = match[2].trim();

      const parts = raw.match(
        /^(.+?)\s*-\s*Day:\s*(.+?)\s*-\s*Time:\s*(.+?)\s*-\s*Room:\s*(.+)$/
      );

      if (parts) {
        committees.push({
          name: parts[1].trim(),
          day: parts[2].trim(),
          time: parts[3].trim(),
          room: parts[4].trim(),
          url,
        });
      } else {
        committees.push({ name: raw, day: "", time: "", room: "", url });
      }
    }

    return new Response(JSON.stringify({ committees }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(JSON.stringify({ committees: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }
};
