export type FileSection = { key: string; label?: string };

export const BUILTIN_FILE_SECTION_KEYS = [
  'CONTRACT',
  'BRANDING',
  'LOGO',
  'CREDENTIAL',
  'DOMAIN',
  'HOSTING',
] as const;

export const DEFAULT_CLIENT_FILE_SECTIONS: FileSection[] = BUILTIN_FILE_SECTION_KEYS.map((key) => ({ key }));

export function parseFileSections(raw: unknown): FileSection[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_CLIENT_FILE_SECTIONS];
  const sections: FileSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const key = String((item as FileSection).key || '').trim();
    if (!key) continue;
    const label = (item as FileSection).label;
    sections.push({ key, ...(label ? { label: String(label).trim() } : {}) });
  }
  return sections.length > 0 ? sections : [...DEFAULT_CLIENT_FILE_SECTIONS];
}

export function isBuiltinFileSectionKey(key: string) {
  return (BUILTIN_FILE_SECTION_KEYS as readonly string[]).includes(key);
}
