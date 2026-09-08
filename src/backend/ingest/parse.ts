import { XMLParser } from "fast-xml-parser";

export type ParsedItem = {
  title: string;
  url: string;
  rawSummary: string;
  publishedAt: Date;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

const SKIP_PATH =
  /\/(opinion|opinions|recipe|recipes|lifestyle|food|horoscope|comics|crossword|games|video\/)\b/i;

const LISTICLE = /^\s*\d+\s+(ways|things|tips|reasons|best|worst)\b/i;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickLink(item: Record<string, unknown>): string {
  const link = item.link;
  if (typeof link === "string") return link.trim();
  if (link && typeof link === "object") {
    const node = link as Record<string, unknown>;
    if (typeof node["@_href"] === "string") return node["@_href"].trim();
    if (typeof node["#text"] === "string") return node["#text"].trim();
  }
  const guid = item.guid;
  if (typeof guid === "string" && /^https?:\/\//i.test(guid)) return guid.trim();
  if (guid && typeof guid === "object") {
    const node = guid as Record<string, unknown>;
    if (typeof node["#text"] === "string" && /^https?:\/\//i.test(node["#text"])) {
      return node["#text"].trim();
    }
  }
  const id = item.id;
  if (typeof id === "string" && /^https?:\/\//i.test(id)) return id.trim();
  return "";
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

function pickSummary(item: Record<string, unknown>): string {
  const candidates = [item.description, item.summary, item["content:encoded"], item.content];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return stripHtml(candidate).slice(0, 2000);
    }
    if (candidate && typeof candidate === "object") {
      const text = (candidate as Record<string, unknown>)["#text"];
      if (typeof text === "string" && text.trim()) {
        return stripHtml(text).slice(0, 2000);
      }
    }
  }
  return "";
}

function pickDate(item: Record<string, unknown>): Date {
  const raw =
    item.pubDate ??
    item.published ??
    item.updated ??
    item["dc:date"] ??
    item["dcterms:modified"];
  if (typeof raw === "string" || typeof raw === "number") {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

function shouldSkipHeuristically(title: string, url: string): boolean {
  if (SKIP_PATH.test(url)) return true;
  if (LISTICLE.test(title)) return true;
  return false;
}

export function parseFeedXml(xml: string): ParsedItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const channel = (doc.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  const atomFeed = doc.feed as Record<string, unknown> | undefined;
  const rdf = doc["rdf:RDF"] as Record<string, unknown> | undefined;

  const items = [
    ...asArray(channel?.item as Record<string, unknown> | undefined),
    ...asArray(atomFeed?.entry as Record<string, unknown> | undefined),
    ...asArray(rdf?.item as Record<string, unknown> | undefined),
  ];

  const out: ParsedItem[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const titleNode = item.title;
    const title =
      typeof titleNode === "string"
        ? stripHtml(titleNode)
        : titleNode &&
            typeof titleNode === "object" &&
            typeof (titleNode as { "#text"?: string })["#text"] === "string"
          ? stripHtml((titleNode as { "#text": string })["#text"])
          : "";
    const url = pickLink(item);
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    if (shouldSkipHeuristically(title, url)) continue;
    out.push({
      title,
      url,
      rawSummary: pickSummary(item),
      publishedAt: pickDate(item),
    });
  }
  return out;
}

export async function hashUrl(url: string): Promise<string> {
  const bytes = new TextEncoder().encode(url);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
