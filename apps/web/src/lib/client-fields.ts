export const CLIENT_CLASSIFICATIONS = ['VVIP', 'VIP', 'NORMAL'] as const;
export type ClientClassification = (typeof CLIENT_CLASSIFICATIONS)[number];

export interface MarketingManagerOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function marketingManagerLabel(
  manager?: Pick<MarketingManagerOption, 'firstName' | 'lastName'> | null,
) {
  if (!manager) return '';
  return `${manager.firstName} ${manager.lastName}`.trim();
}

export function classificationLabel(
  t: (key: string) => string,
  value?: string | null,
) {
  if (value === 'VVIP') return t('classificationVVIP');
  if (value === 'VIP') return t('classificationVIP');
  if (value === 'NORMAL') return t('classificationNormal');
  return value || '—';
}
