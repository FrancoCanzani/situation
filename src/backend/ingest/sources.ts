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
    id: "cnn-world",
    name: "CNN",
    rss: "http://rss.cnn.com/rss/edition_world.rss",
    region: "us",
  },
  {
    id: "fox-world",
    name: "Fox News",
    rss: "https://moxie.foxnews.com/google-publisher/world.xml",
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
    id: "nbc-world",
    name: "NBC News",
    rss: "https://feeds.nbcnews.com/nbcnews/public/world",
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
    id: "spiegel-intl",
    name: "Der Spiegel",
    rss: "https://www.spiegel.de/international/index.rss",
    region: "eu",
  },
  {
    id: "corriere-esteri",
    name: "Corriere della Sera",
    rss: "https://xml2.corriereobjects.it/rss/esteri.xml",
    region: "eu",
  },
  {
    id: "repubblica-esteri",
    name: "La Repubblica",
    rss: "https://www.repubblica.it/rss/esteri/rss2.0.xml",
    region: "eu",
  },
  {
    id: "bild-politik",
    name: "Bild",
    rss: "https://www.bild.de/feed/politik.xml",
    region: "eu",
  },
  {
    id: "figaro-intl",
    name: "Le Figaro",
    rss: "https://www.lefigaro.fr/rss/figaro_international.xml",
    region: "eu",
  },
  {
    id: "tagesschau",
    name: "tagesschau",
    rss: "https://www.tagesschau.de/index~rss2.xml",
    region: "eu",
  },
  {
    id: "politico-eu",
    name: "Politico EU",
    rss: "https://www.politico.eu/section/politics/feed/",
    region: "eu",
  },
  {
    id: "bbc-sport",
    name: "BBC Sport",
    rss: "https://feeds.bbci.co.uk/sport/rss.xml",
    region: "uk",
  },
  {
    id: "guardian-sport",
    name: "Guardian Sport",
    rss: "https://www.theguardian.com/sport/rss",
    region: "uk",
  },
  {
    id: "sky-sports",
    name: "Sky Sports",
    rss: "https://www.skysports.com/rss/12040",
    region: "uk",
  },
  {
    id: "espn",
    name: "ESPN",
    rss: "https://www.espn.com/espn/rss/news",
    region: "us",
  },
  {
    id: "espn-soccer",
    name: "ESPN Soccer",
    rss: "https://www.espn.com/espn/rss/soccer/news",
    region: "us",
  },
  {
    id: "athletic",
    name: "The Athletic",
    rss: "https://www.nytimes.com/athletic/rss/news/",
    region: "us",
  },
  {
    id: "cbs-sports",
    name: "CBS Sports",
    rss: "https://www.cbssports.com/rss/headlines/",
    region: "us",
  },
  {
    id: "yahoo-sports",
    name: "Yahoo Sports",
    rss: "https://sports.yahoo.com/rss/",
    region: "us",
  },
  {
    id: "marca",
    name: "Marca",
    rss: "https://e00-marca.uecdn.es/rss/portada.xml",
    region: "eu",
  },
  {
    id: "gazzetta",
    name: "Gazzetta",
    rss: "https://www.gazzetta.it/rss/home.xml",
    region: "eu",
  },
  {
    id: "autosport",
    name: "Autosport",
    rss: "https://www.autosport.com/rss/feed/f1",
    region: "uk",
  },
  {
    id: "formula1",
    name: "Formula 1",
    rss: "https://www.formula1.com/content/fom-website/en/latest/all.xml",
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
