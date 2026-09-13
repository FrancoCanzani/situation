import { fetchRss } from "../fetch";
import type { RawArticle } from "../sources";

const GN_FEED =
  "https://news.google.com/rss/search?q=site:reuters.com/world+when:1d&ceid=US:en&hl=en-US&gl=US";

const GN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

const BATCH_URL = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const TITLE_SUFFIX = /\s+-\s+Reuters\s*$/i;
const TEXT_SOURCE = /\s*Reuters\s*$/i;
const MAX_ARTICLES = 20;
const RESOLVE_CONCURRENCY = 4;

export async function fetchReuters(): Promise<RawArticle[]> {
  const listed = await fetchRss(GN_FEED, { maxArticles: 40, timeoutMs: 12_000 });
  const reuters = listed.filter((article) => isReutersGoogleItem(article));
  const resolved = await mapPool(reuters.slice(0, MAX_ARTICLES), RESOLVE_CONCURRENCY, resolveItem);
  return resolved.filter((article): article is RawArticle => article !== null);
}

function isReutersGoogleItem(article: RawArticle): boolean {
  if (/reuters\.com\//i.test(article.url)) return true;
  if (!/news\.google\.com\/.*articles\//i.test(article.url)) return false;
  return TITLE_SUFFIX.test(article.title) || /\breuters\b/i.test(article.text);
}

async function resolveItem(article: RawArticle): Promise<RawArticle | null> {
  const title = article.title.replace(TITLE_SUFFIX, "").trim();
  if (!title) return null;

  if (/^https?:\/\/(?:www\.)?reuters\.com\//i.test(article.url)) {
    return { ...article, title };
  }

  const url = await resolveGoogleNewsUrl(article.url);
  if (!url || !/^https?:\/\/(?:www\.)?reuters\.com\//i.test(url)) return null;

  return {
    title,
    url,
    text: article.text.replace(TITLE_SUFFIX, "").replace(TEXT_SOURCE, "").trim(),
    publishedAt: article.publishedAt,
    image: article.image,
  };
}

async function resolveGoogleNewsUrl(articleUrl: string): Promise<string | undefined> {
  const articleId = articleUrl.split("/").pop()?.split("?")[0];
  if (!articleId) return undefined;

  const pageUrl = `https://news.google.com/rss/articles/${articleId}`;
  const page = await fetch(pageUrl, {
    headers: {
      "user-agent": GN_UA,
      "accept-language": "en-US,en;q=0.9",
      cookie: "CONSENT=YES+cb.20210418-17-p0.en+FX+667",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!page.ok) return undefined;
  const html = await page.text();

  const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!signature || !timestamp) return undefined;

  const rpcInner = JSON.stringify([
    "garturlreq",
    [
      ["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
      "X",
      "X",
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    articleId,
    Number(timestamp),
    signature,
  ]);
  const fReq = JSON.stringify([[["Fbv4je", rpcInner, null, "generic"]]]);

  const response = await fetch(BATCH_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": GN_UA,
      referer: "https://news.google.com/",
    },
    body: new URLSearchParams({ "f.req": fReq }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return undefined;

  let body = await response.text();
  if (body.startsWith(")]}'")) body = body.slice(4);
  body = body.trimStart();
  const nl = body.indexOf("\n");
  if (nl !== -1 && /^\d+$/.test(body.slice(0, nl).trim())) body = body.slice(nl + 1);

  let envelopes: unknown;
  try {
    envelopes = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (!Array.isArray(envelopes)) return undefined;

  for (const env of envelopes) {
    if (!Array.isArray(env) || env[0] !== "wrb.fr" || env[1] !== "Fbv4je") continue;
    if (typeof env[2] !== "string") continue;
    try {
      const payload = JSON.parse(env[2]) as unknown;
      if (Array.isArray(payload) && payload[0] === "garturlres" && typeof payload[1] === "string") {
        return payload[1];
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = Array.from({ length: items.length }) as R[];
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let index = next++; index < items.length; index = next++) {
      const item = items[index];
      if (item !== undefined) out[index] = await fn(item);
    }
  });
  await Promise.all(workers);
  return out;
}
