export type SocialLinkEntry = {
  handle: string;
  loginUsername?: string;
  loginPassword?: string;
};

export type SocialLinksMap = Record<string, string | SocialLinkEntry>;

export function parseSocialEntry(value: unknown): SocialLinkEntry {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    return {
      handle: String(o.handle ?? o.url ?? '').trim(),
      loginUsername: String(o.loginUsername ?? '').trim() || undefined,
      loginPassword: String(o.loginPassword ?? '').trim() || undefined,
    };
  }
  return { handle: String(value ?? '').trim() };
}

export function socialEntryHasData(entry: SocialLinkEntry) {
  return Boolean(entry.handle || entry.loginUsername || entry.loginPassword);
}

export function serializeSocialEntry(entry: SocialLinkEntry): string | SocialLinkEntry {
  const handle = entry.handle.trim();
  const loginUsername = entry.loginUsername?.trim();
  const loginPassword = entry.loginPassword?.trim();
  if (loginUsername || loginPassword) {
    return {
      handle,
      ...(loginUsername ? { loginUsername } : {}),
      ...(loginPassword ? { loginPassword } : {}),
    };
  }
  return handle;
}
