export type FileSection = { key: string; label?: string };

export const BUILTIN_FILE_LABEL_KEYS: Record<string, string> = {
  CONTRACT: 'filesContract',
  BRANDING: 'filesBranding',
  LOGO: 'filesLogo',
  CREDENTIAL: 'filesCredentials',
  DOMAIN: 'filesDomain',
  HOSTING: 'filesHosting',
  MEDIA: 'filesMedia',
};

export function fileSectionTitle(section: FileSection, tc: (key: string) => string) {
  if (section.label?.trim()) return section.label.trim();
  const labelKey = BUILTIN_FILE_LABEL_KEYS[section.key];
  return labelKey ? tc(labelKey) : section.key;
}
