import { decodeHTML } from "entities";
import { parseFeed } from "feedsmith";

import type { RawArticle, Source } from "./sources";

const USER_AGENT = "SituationBot/0.1 (+https://situation.local)";
const ACCEPT =
  "application/rss+xml, application/atom+xml, application/feed+json, application/json, */*;q=0.8";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ARTICLES = 40;

const HAS_TAG = /<[a-z!/]/i;
const BLOCK_END =
  /<\/(p|div|section|article|aside|li|ul|ol|blockquote|h[1-6]|tr|td|th)\s*>/gi;
const SELF_BREAK = /<(br|hr)\b[^>]*>/gi;
const DROPPED = /<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const TAG = /<[^>]+>/g;

const TRACKING_PARAM =
  /^(utm_\w*|ga_\w*|mc_[ce]id|pk_\w*|fbclid|gclid|gbraid|wbraid|igshid|mkt_tok|cmpid|smid|ref|ref_src|referrer|s_kwcid|at_medium|at_campaign|__twitter_impression)$/i;

const MIN_YEAR = 1990;
const FUTURE_SLACK_MS = 2 * 24 * 60 * 60 * 1000;

export class FetchError extends Error {
  readonly url: string | undefined;
  readonly status: number | undefined;

  constructor(message: string, init: { url?: string; status?: number; cause?: unknown } = {}) {
    super(message, { cause: init.cause });
    this.name = "FetchError";
    this.url = init.url;
    this.status = init.status;
  }
}

export async function articlesFor(source: Source): Promise<RawArticle[]> {
  if (source.fetch) return source.fetch();
  if (!source.rss) throw new FetchError(`${source.id}: need rss or fetch`);
  return fetchRss(source.rss);
}

export async function fetchRss(
  rssUrl: string,
  options: { maxArticles?: number; timeoutMs?: number } = {},
): Promise<RawArticle[]> {
  const body = await fetchText(rssUrl, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const articles = parseFeedBody(body, rssUrl);
  return dedupe(articles).slice(0, options.maxArticles ?? DEFAULT_MAX_ARTICLES);
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: ACCEPT },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
  } catch (error) {
    throw new FetchError(`fetch failed for ${url}: ${messageOf(error)}`, {
      url,
      cause: error,
    });
  }

  if (!response.ok) {
    throw new FetchError(`HTTP ${response.status} fetching ${url}`, {
      url,
      status: response.status,
    });
  }

  return response.text();
}

function parseFeedBody(body: string, feedUrl: string): RawArticle[] {
  let parsed;
  try {
    parsed = parseFeed(body);
  } catch (error) {
    throw new FetchError(`feed parse failed for ${feedUrl}: ${messageOf(error)}`, {
      url: feedUrl,
      cause: error,
    });
  }

  switch (parsed.format) {
    case "rss": {
      const feed = parsed.feed;
      return compact(
        (feed.items ?? []).map((item) =>
          articleOf({
            title: item.title,
            url:
              httpUrl(item.link) ??
              (item.guid?.isPermaLink === false ? undefined : httpUrl(item.guid?.value)) ??
              atomUrl(item.atom?.links, item.atom?.id, feedUrl) ??
              absUrl(item.link, feedUrl),
            text: item.content?.encoded ?? item.description ?? item.dc?.descriptions?.[0],
            publishedAt: item.pubDate ?? item.dc?.dates?.[0] ?? item.dcterms?.dates?.[0],
            image: item.enclosures?.find((enc) => enc.type?.startsWith("image/"))?.url,
          }),
        ),
      );
    }
    case "atom": {
      const feed = parsed.feed;
      return compact(
        (feed.entries ?? []).map((entry) =>
          articleOf({
            title: entry.title,
            url: atomUrl(entry.links, entry.id, feedUrl),
            text: entry.content ?? entry.summary ?? entry.dc?.descriptions?.[0],
            publishedAt:
              entry.published ?? entry.updated ?? entry.dc?.dates?.[0] ?? entry.dcterms?.dates?.[0],
          }),
        ),
      );
    }
    case "rdf": {
      const feed = parsed.feed;
      return compact(
        (feed.items ?? []).map((item) =>
          articleOf({
            title: item.title,
            url: httpUrl(item.link) ?? absUrl(item.link, feedUrl),
            text: item.content?.encoded ?? item.description ?? item.dc?.descriptions?.[0],
            publishedAt: item.dc?.dates?.[0] ?? item.dcterms?.dates?.[0],
          }),
        ),
      );
    }
    case "json": {
      const feed = parsed.feed;
      return compact(
        (feed.items ?? []).map((item) =>
          articleOf({
            title: item.title,
            url: item.url ?? item.external_url ?? item.id,
            text: item.content_text ?? item.content_html ?? item.summary,
            publishedAt: item.date_published ?? item.date_modified,
            image: item.image ?? item.banner_image,
          }),
        ),
      );
    }
    default: {
      const unhandled: never = parsed;
      throw new FetchError(`unknown feed format at ${feedUrl}: ${JSON.stringify(unhandled)}`, {
        url: feedUrl,
      });
    }
  }
}

function articleOf(raw: {
  title?: string;
  url?: string;
  text?: string;
  publishedAt?: string;
  image?: string;
}): RawArticle | null {
  const title = toPlainText(raw.title ?? "");
  const url = canonicalize(httpUrl(raw.url));
  if (!title || !url) return null;
  const article: RawArticle = {
    title,
    url,
    text: raw.text?.trim() ? toBodyText(raw.text) : "",
    publishedAt: toDate(raw.publishedAt),
  };
  const image = httpUrl(raw.image);
  if (image) article.image = image;
  return article;
}

function toPlainText(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (!HAS_TAG.test(raw)) return collapseWs(decodeHTML(raw));
  return collapseWs(htmlToText(raw));
}

function toBodyText(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (!HAS_TAG.test(raw)) return collapseLines(decodeHTML(raw));
  return collapseLines(htmlToText(raw));
}

function htmlToText(html: string): string {
  return decodeHTML(
    html
      .replace(DROPPED, " ")
      .replace(SELF_BREAK, "\n")
      .replace(BLOCK_END, "$&\n")
      .replace(TAG, " "),
  );
}

function collapseWs(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collapseLines(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function httpUrl(value: string | undefined): string | undefined {
  const url = value?.trim();
  if (url && /^https?:\/\//i.test(url)) return url;
  return undefined;
}

function absUrl(value: string | undefined, base: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  if (base) {
    try {
      return httpUrl(new URL(value.trim(), base).href);
    } catch {
      return httpUrl(value);
    }
  }
  return httpUrl(value);
}

function atomUrl(
  links: Array<{ href?: string; rel?: string }> | undefined,
  id: string | undefined,
  base: string | undefined,
): string | undefined {
  const alternate = links?.find((link) => link.rel === "alternate");
  return absUrl(alternate?.href, base) ?? absUrl(links?.[0]?.href, base) ?? httpUrl(id);
}

function canonicalize(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAM.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    parsed.hash = "";
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    parsed.pathname = path;
    return parsed.href;
  } catch {
    return url;
  }
}

function canonicalKey(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAM.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${host}${path}${parsed.search}`;
  } catch {
    return undefined;
  }
}

function dedupe(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = canonicalKey(article.url) ?? article.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toDate(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const date = new Date(raw.trim());
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  if (date.getUTCFullYear() < MIN_YEAR) return null;
  if (time > Date.now() + FUTURE_SLACK_MS) return null;
  return date;
}

function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value !== null && value !== undefined);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
