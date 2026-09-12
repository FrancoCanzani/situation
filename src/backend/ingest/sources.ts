import { fetchReuters } from "./adapters/reuters";

export type SourceRegion = "us" | "uk" | "eu";

export type RawArticle = {
  title: string;
  url: string;
  text: string;
  publishedAt: Date | null;
  image?: string;
};

export type Source = {
  id: string;
  name: string;
  region: SourceRegion;
  rss?: string;
  fetch?: () => Promise<RawArticle[]>;
};

export const SOURCES: Source[] = [
  {
    id: "reuters-world",
    name: "Reuters",
    region: "us",
    fetch: fetchReuters,
  },
  {
    id: "nyt-world",
    name: "NYT",
    rss: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    region: "us",
  },
  {
    id: "wapo-world",
    name: "Washington Post",
    rss: "https://feeds.washingtonpost.com/rss/world",
    region: "us",
  },
  {
    id: "wsj-world",
    name: "WSJ",
    rss: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    region: "us",
  },
  {
    id: "bloomberg-markets",
    name: "Bloomberg",
    rss: "https://feeds.bloomberg.com/markets/news.rss",
    region: "us",
  },
  {
    id: "bloomberg-politics",
    name: "Bloomberg",
    rss: "https://feeds.bloomberg.com/politics/news.rss",
    region: "us",
  },
  {
    id: "axios",
    name: "Axios",
    rss: "https://api.axios.com/feed/",
    region: "us",
  },
  {
    id: "npr-world",
    name: "NPR",
    rss: "https://feeds.npr.org/1004/rss.xml",
    region: "us",
  },
  {
    id: "bbc-world",
    name: "BBC",
    rss: "https://feeds.bbci.co.uk/news/world/rss.xml",
    region: "uk",
  },
  {
    id: "guardian-world",
    name: "Guardian",
    rss: "https://www.theguardian.com/world/rss",
    region: "uk",
  },
  {
    id: "ft-world",
    name: "Financial Times",
    rss: "https://www.ft.com/world?format=rss",
    region: "uk",
  },
  {
    id: "sky-world",
    name: "Sky News",
    rss: "https://feeds.skynews.com/feeds/rss/world.xml",
    region: "uk",
  },
  {
    id: "france24",
    name: "France 24",
    rss: "https://www.france24.com/en/rss",
    region: "eu",
  },
  {
    id: "dw-world",
    name: "DW",
    rss: "https://rss.dw.com/rdf/rss-en-world",
    region: "eu",
  },
  {
    id: "lemonde-intl",
    name: "Le Monde",
    rss: "https://www.lemonde.fr/en/international/rss_full.xml",
    region: "eu",
  },
  {
    id: "elpais-en",
    name: "El País",
    rss: "https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada",
    region: "eu",
  },
  {
    id: "politico-eu",
    name: "Politico EU",
    rss: "https://www.politico.eu/section/politics/feed/",
    region: "eu",
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    rss: "https://techcrunch.com/feed/",
    region: "us",
  },
  {
    id: "ars-technica",
    name: "Ars Technica",
    rss: "https://feeds.arstechnica.com/arstechnica/index",
    region: "us",
  },
  {
    id: "bloomberg-tech",
    name: "Bloomberg",
    rss: "https://feeds.bloomberg.com/technology/news.rss",
    region: "us",
  },
  {
    id: "mit-tech-review",
    name: "MIT Technology Review",
    rss: "https://www.technologyreview.com/feed/",
    region: "us",
  },
];

const RETIRED_NAMES: Record<string, string> = {
  "abc-au-world": "ABC Australia",
  africanews: "Africanews",
  "al-monitor": "Al-Monitor",
  aljazeera: "Al Jazeera",
  "bbc-europe": "BBC",
  "cnn-world": "CNN",
  "fox-world": "Fox News",
  "guardian-europe": "Guardian",
  "moscow-times": "Moscow Times",
  "npr-news": "NPR",
  "pbs-news": "PBS",
  "straits-world": "Straits Times",
  "wapo-national": "Washington Post",
};

export function sourceName(sourceId: string): string {
  return (
    SOURCES.find((source) => source.id === sourceId)?.name ??
    RETIRED_NAMES[sourceId] ??
    sourceId
  );
}
