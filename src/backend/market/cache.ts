export async function cachedJson<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  try {
    const cache = caches.default;
    const request = new Request(`https://situation.cache/${key}`);
    const hit = await cache.match(request);
    if (hit) return hit.json() as Promise<T>;

    const value = await load();
    const response = new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttlSeconds}`,
      },
    });
    await cache.put(request, response.clone());
    return value;
  } catch {
    return load();
  }
}
