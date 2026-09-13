import type { FeedSort } from "../../shared/types";

export type DateCursor = {
  sort: "date";
  at: Date;
  id: string;
};

export type RelevanceCursor = {
  sort: "relevance";
  importance: number;
  at: Date;
  id: string;
};

export type FeedCursor = DateCursor | RelevanceCursor;

export function encodeDateCursor(at: Date, id: string) {
  return `${at.getTime()}_${id}`;
}

export function encodeRelevanceCursor(
  importance: number,
  at: Date,
  id: string,
) {
  return `${importance}_${at.getTime()}_${id}`;
}

export function decodeCursor(
  cursor: string | undefined,
  sort: FeedSort,
): FeedCursor | null {
  if (!cursor) return null;

  switch (sort) {
    case "relevance": {
      const [importanceRaw, ms, id] = cursor.split("_", 3);
      const importance = Number(importanceRaw);
      const time = Number(ms);
      if (!id || !Number.isFinite(importance) || !Number.isFinite(time)) {
        return null;
      }
      return { sort: "relevance", importance, at: new Date(time), id };
    }
    case "date": {
      const [ms, id] = cursor.split("_", 2);
      const time = Number(ms);
      if (!id || !Number.isFinite(time)) return null;
      return { sort: "date", at: new Date(time), id };
    }
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}
