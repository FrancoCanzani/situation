export type FeedSource = {
  id: string;
  name: string;
  url: string;
  region: "us" | "eu" | "intl";
};

export const FEEDS: FeedSource[] = [
  {
    id: "npr-world",
    name: "NPR",
    url: "https://feeds.npr.org/1004/rss.xml",
    region: "us",
  },
  {
    id: "wapo-world",
    name: "Washington Post",
    url: "https://feeds.washingtonpost.com/rss/world",
    region: "us",
  },
  {
    id: "nyt-world",
    name: "NYT",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    region: "us",
  },
  {
    id: "bbc-world",
    name: "BBC",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    region: "eu",
  },
  {
    id: "guardian-world",
    name: "Guardian",
    url: "https://www.theguardian.com/world/rss",
    region: "eu",
  },
  {
    id: "dw-world",
    name: "DW",
    url: "https://rss.dw.com/rdf/rss-en-world",
    region: "eu",
  },
  {
    id: "lemonde-intl",
    name: "Le Monde",
    url: "https://www.lemonde.fr/en/international/rss_full.xml",
    region: "eu",
  },
  {
    id: "elpais-en",
    name: "El País",
    url: "https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada",
    region: "eu",
  },
  {
    id: "politico-eu",
    name: "Politico EU",
    url: "https://www.politico.eu/section/politics/feed/",
    region: "eu",
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    region: "intl",
  },
  {
    id: "abc-au-world",
    name: "ABC Australia",
    url: "https://www.abc.net.au/news/feed/51120/rss.xml",
    region: "intl",
  },
  {
    id: "straits-world",
    name: "Straits Times",
    url: "https://www.straitstimes.com/news/world/rss.xml",
    region: "intl",
  },
  {
    id: "moscow-times",
    name: "Moscow Times",
    url: "https://www.themoscowtimes.com/rss/news",
    region: "intl",
  },
  {
    id: "al-monitor",
    name: "Al-Monitor",
    url: "https://www.al-monitor.com/rss.xml",
    region: "intl",
  },
  {
    id: "africanews",
    name: "Africanews",
    url: "https://www.africanews.com/feed/rss",
    region: "intl",
  },
];

const RETIRED_NAMES: Record<string, string> = {
  "bbc-europe": "BBC",
  "cnn-world": "CNN",
  "fox-world": "Fox News",
  france24: "France 24",
  "guardian-europe": "Guardian",
  "npr-news": "NPR",
  "pbs-news": "PBS",
  "wapo-national": "Washington Post",
  "wsj-world": "WSJ",
};

export function sourceName(sourceId: string): string {
  return (
    FEEDS.find((feed) => feed.id === sourceId)?.name ??
    RETIRED_NAMES[sourceId] ??
    sourceId
  );
}
