import { isValid } from "date-fns";
import { parseFeed } from "feedsmith";

export type ParsedItem = {
  title: string;
  url: string;
  rawSummary: string;
  publishedAt: Date;
};

const SKIP_PATH =
  /\/(opinion|opinions|recipe|recipes|lifestyle|food|horoscope|comics|crossword|games|video\/)\b/i;

const LISTICLE = /^\s*\d+\s+(ways|things|tips|reasons|best|worst)\b/i;

function httpUrl(value: string | undefined): string | undefined {
  const url = value?.trim();
  if (url && /^https?:\/\//i.test(url)) return url;
  return undefined;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toDate(raw: string | undefined): Date {
  if (!raw) return new Date();
  const date = new Date(raw);
  return isValid(date) ? date : new Date();
}

function shouldSkipHeuristically(title: string, url: string): boolean {
  if (SKIP_PATH.test(url)) return true;
  if (LISTICLE.test(title)) return true;
  return false;
}

function toParsedItem(raw: {
  title?: string;
  url?: string;
  summary?: string;
  publishedAt?: string;
}): ParsedItem[] {
  const title = stripHtml(raw.title ?? "");
  const url = httpUrl(raw.url);
  if (!title || !url) return [];
  if (shouldSkipHeuristically(title, url)) return [];
  return [
    {
      title,
      url,
      rawSummary: stripHtml(raw.summary ?? "").slice(0, 2000),
      publishedAt: toDate(raw.publishedAt),
    },
  ];
}

function atomUrl(
  links: Array<{ href?: string; rel?: string }> | undefined,
  id?: string,
): string | undefined {
  const alternate = links?.find((link) => link.rel === "alternate");
  return httpUrl(alternate?.href) ?? httpUrl(links?.[0]?.href) ?? httpUrl(id);
}

export function parseFeedXml(xml: string): ParsedItem[] {
  const parsed = parseFeed(xml);
  switch (parsed.format) {
    case "rss":
      return (parsed.feed.items ?? []).flatMap((item) =>
        toParsedItem({
          title: item.title,
          url:
            httpUrl(item.link) ??
            (item.guid?.isPermaLink === false ? undefined : httpUrl(item.guid?.value)) ??
            atomUrl(item.atom?.links, item.atom?.id),
          summary: item.content?.encoded ?? item.description ?? item.dc?.descriptions?.[0],
          publishedAt: item.pubDate ?? item.dc?.dates?.[0] ?? item.dcterms?.dates?.[0],
        }),
      );
    case "atom":
      return (parsed.feed.entries ?? []).flatMap((entry) =>
        toParsedItem({
          title: entry.title,
          url: atomUrl(entry.links, entry.id),
          summary: entry.summary ?? entry.content ?? entry.dc?.descriptions?.[0],
          publishedAt:
            entry.published ?? entry.updated ?? entry.dc?.dates?.[0] ?? entry.dcterms?.dates?.[0],
        }),
      );
    case "rdf":
      return (parsed.feed.items ?? []).flatMap((item) =>
        toParsedItem({
          title: item.title,
          url: item.link,
          summary: item.content?.encoded ?? item.description ?? item.dc?.descriptions?.[0],
          publishedAt: item.dc?.dates?.[0] ?? item.dcterms?.dates?.[0],
        }),
      );
    case "json":
      return (parsed.feed.items ?? []).flatMap((item) =>
        toParsedItem({
          title: item.title,
          url: item.url ?? item.external_url ?? item.id,
          summary: item.content_text ?? item.summary ?? item.content_html,
          publishedAt: item.date_published ?? item.date_modified,
        }),
      );
    default: {
      const _never: never = parsed;
      return _never;
    }
  }
}

export async function hashUrl(url: string): Promise<string> {
  const bytes = new TextEncoder().encode(url);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
