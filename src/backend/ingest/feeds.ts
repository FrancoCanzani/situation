export type FeedSource = {
  id: string;
  name: string;
  url: string;
  region: "us" | "eu" | "intl";
};

export const FEEDS: FeedSource[] = [
  {
    id: "npr-news",
    name: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml",
    region: "us",
  },
  {
    id: "npr-world",
    name: "NPR World",
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
    id: "wapo-national",
    name: "Washington Post",
    url: "https://feeds.washingtonpost.com/rss/national",
    region: "us",
  },
  {
    id: "nyt-world",
    name: "NYT",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    region: "us",
  },
  {
    id: "cnn-world",
    name: "CNN",
    url: "http://rss.cnn.com/rss/cnn_world.rss",
    region: "us",
  },
  {
    id: "pbs-news",
    name: "PBS",
    url: "https://www.pbs.org/newshour/feeds/rss/headlines",
    region: "us",
  },
  {
    id: "wsj-world",
    name: "WSJ",
    url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    region: "us",
  },
  {
    id: "fox-world",
    name: "Fox News",
    url: "https://moxie.foxnews.com/google-publisher/world.xml",
    region: "us",
  },
  // {
  //   id: "espn",
  //   name: "ESPN",
  //   url: "https://www.espn.com/espn/rss/news",
  //   region: "us",
  // },
  {
    id: "bbc-world",
    name: "BBC",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    region: "eu",
  },
  {
    id: "bbc-europe",
    name: "BBC",
    url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    region: "eu",
  },
  // {
  //   id: "bbc-sport",
  //   name: "BBC Sport",
  //   url: "https://feeds.bbci.co.uk/sport/rss.xml",
  //   region: "eu",
  // },
  {
    id: "guardian-world",
    name: "Guardian",
    url: "https://www.theguardian.com/world/rss",
    region: "eu",
  },
  {
    id: "guardian-europe",
    name: "Guardian",
    url: "https://www.theguardian.com/world/europe-news/rss",
    region: "eu",
  },
  {
    id: "dw-world",
    name: "DW",
    url: "https://rss.dw.com/rdf/rss-en-world",
    region: "eu",
  },
  {
    id: "politico-eu",
    name: "Politico EU",
    url: "https://www.politico.eu/feed/",
    region: "eu",
  },
  {
    id: "france24",
    name: "France 24",
    url: "https://www.france24.com/en/rss",
    region: "eu",
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    region: "intl",
  },
];

export function sourceName(sourceId: string): string {
  return FEEDS.find((feed) => feed.id === sourceId)?.name ?? sourceId;
}
