export function encodeCursor(at: Date, id: string) {
  return `${at.getTime()}_${id}`;
}

export function decodeCursor(cursor: string | undefined) {
  const [ms, id] = cursor?.split("_", 2) ?? [];
  const time = Number(ms);
  if (!id || !Number.isFinite(time)) return null;
  return { at: new Date(time), id };
}
