const SKIP_PATH =
  /\/(opinion|opinions|recipe|recipes|lifestyle|food|horoscope|comics|crossword|games|video\/|fantasy)\b/i;

const LISTICLE = /^\s*\d+\s+(ways|things|tips|reasons|best|worst)\b/i;

const SCORELINE = /\b\d{1,2}\s*[-–—]\s*\d{1,2}\b/;

const SPORTS_PERSONNEL =
  /\b(sack(?:ed|s)?|fir(?:ed|es|ing)|appoint(?:ed|s|ing)?|hir(?:ed|es|ing)|dismiss(?:ed|es|ing)|replac(?:ed|es|ing)|resign(?:ed|s|ing)?)\b/i;

const SPORTS_ROLE =
  /\b(manager|coach|head coach|sporting director|director of football)\b/i;

const SPORTS_NOISE =
  /\b(coaches?\s+poll|ap\s+top\s*25|ap\s+poll|cfp\s+rankings?|power\s+rankings?|mock\s+draft|fantasy\s+(football|basketball|baseball|points)|week\s+\d+\s+inactives?|transfer\s+portal|heisman|march\s+madness\s+bracket|season\s+opener|training\s+camp|game\s+preview|match\s+preview)\b/i;

const SPORTS_RANK_MOVE =
  /\b(rises?|climbs?|falls?|drops?|moves?)\s+to\s+(no\.?|#)\s*\d+\b/i;

const SPORTS_INJURY =
  /\b(rule[sd]?\s+out|ruled\s+out|questionable|doubtful|out\s+for\s+(the\s+)?(season|year)|injury\s+report|injured|hamstring|acl|mcl|achilles|concussion|sprain|strain)\b/i;

const SPORTS_RESULT_VERB =
  /\b(defeats?|beats?|thrashes|crushes|edges?|overcomes|loses?\s+to|wins?\s+against|draw(?:s|n)?\s+with)\b/i;

const PLAYER_PAY =
  /\bsigns?\b.{0,100}(\$\s?\d[\d.,]*\s*(million|billion|m).{0,40}\b(per year|a year|\/yr|annually)|\b(per year|a year|\/yr|annually).{0,40}\$\s?\d)/i;

const PLAYER_EXTENSION =
  /\b(signs?|agrees?\s+to)\b.{0,60}\b(contract\s+)?extension\b/i;

export function shouldSkipHeuristically(title: string, url: string): boolean {
  if (SKIP_PATH.test(url)) return true;
  if (LISTICLE.test(title)) return true;
  if (SCORELINE.test(title)) return true;
  if (SPORTS_PERSONNEL.test(title) && SPORTS_ROLE.test(title)) return true;
  if (SPORTS_NOISE.test(title)) return true;
  if (SPORTS_RANK_MOVE.test(title)) return true;
  if (SPORTS_INJURY.test(title)) return true;
  if (SPORTS_RESULT_VERB.test(title)) return true;
  if (PLAYER_PAY.test(title) || PLAYER_EXTENSION.test(title)) return true;
  if (
    /\b(no\.?|#)\s*\d+\b/i.test(title) &&
    /\b(poll|rankings?|ranked)\b/i.test(title)
  ) {
    return true;
  }
  return false;
}
