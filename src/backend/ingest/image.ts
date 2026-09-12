const OG_IMAGE =
  /(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/i;

const FETCH_HEADERS = {
  "user-agent": "SituationBot/0.1 (+https://situation.local)",
  accept: "text/html,application/xhtml+xml",
};

export function httpImageUrl(value: string | undefined | null): string | undefined {
  const url = value?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return undefined;
  return url;
}

export async function fetchOgImage(pageUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(pageUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });
    if (!response.ok) return undefined;
    const html = (await response.text()).slice(0, 200_000);
    const match = OG_IMAGE.exec(html);
    return httpImageUrl(match?.[1] ?? match?.[2]);
  } catch {
    return undefined;
  }
}

export async function resolveArticleImage(input: {
  feedImage?: string | null;
  pageUrl: string;
  importance: number | null;
}): Promise<string | undefined> {
  const fromFeed = httpImageUrl(input.feedImage);
  if (fromFeed) return fromFeed;
  if ((input.importance ?? 0) <= 9) return undefined;
  return fetchOgImage(input.pageUrl);
}
