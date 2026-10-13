/** Discord channel labels contain no internal IDs; the durable identity stays in the topic. */
function truncate(value: string, maxLength: number): string {
  let result = '';
  for (const point of value) { if (result.length + point.length > maxLength) break; result += point; }
  return result.replace(/-+$/g, '');
}
function label(value: string | undefined, maxLength: number): string {
  return truncate((value ?? '').normalize('NFKC').toLowerCase()
    .replace(/\p{Default_Ignorable_Code_Point}/gu, '')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/(^|-)\p{M}+/gu, '$1')
    .replace(/^-+|-+$/g, ''), maxLength);
}

export function ticketChannelName(typeName: string, member: { displayName?: string; user: { username: string } }, occupiedNames: Iterable<string> = []): string {
  const type = label(typeName, 45) || 'support';
  const owner = label(member.displayName, 40) || label(member.user.username, 40) || 'member';
  const base = `${type}-${owner}`;
  const occupied = new Set([...occupiedNames].map(name => name.normalize('NFKC').toLowerCase()));
  if (!occupied.has(base)) return base;
  // Human-readable ordinals disambiguate open tickets without exposing random IDs.
  for (let ordinal = 2; ; ordinal++) {
    const suffix = `-${ordinal}`;
    // Leave room for the closed- archive prefix without losing the member name.
    const candidate = `${truncate(base, 93 - suffix.length)}${suffix}`;
    if (!occupied.has(candidate)) return candidate;
  }
}

/** Reproduce the previous label exactly, so migrations do not overwrite staff renames. */
export function legacyTicketChannelName(typeId: string, username: string): string {
  return `${typeId === 'default' ? 'ticket' : typeId}-${username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'member'}`;
}
