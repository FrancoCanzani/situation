const SKIP_PATH =
  /\/(opinion|opinions|recipe|recipes|lifestyle|food|horoscope|comics|crossword|games|video\/)\b/i;

const LISTICLE = /^\s*\d+\s+(ways|things|tips|reasons|best|worst)\b/i;

export function shouldSkipHeuristically(title: string, url: string): boolean {
  if (SKIP_PATH.test(url)) return true;
  if (LISTICLE.test(title)) return true;
  return false;
}
