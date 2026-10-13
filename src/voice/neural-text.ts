/** Bound neural inference by short word/sentence chunks instead of a full 400-character activation graph. */
export function splitSpeechText(text: string, maximum = 100): string[] {
  const chunks: string[] = [];
  let rest = text.replace(/\s+/g, ' ').trim();
  while (rest.length > maximum) {
    const window = rest.slice(0, maximum + 1);
    let end = -1;
    for (const match of window.matchAll(/[.!?;:,]\s/g)) if (match.index! >= Math.floor(maximum / 3)) end = match.index! + 1;
    if (end < 0) end = window.lastIndexOf(' ');
    if (end < Math.floor(maximum / 3)) end = maximum;
    // Preserve surrogate pairs when an uninterrupted word must be split.
    if (/[\uD800-\uDBFF]/.test(rest[end - 1]!)) end--;
    chunks.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
