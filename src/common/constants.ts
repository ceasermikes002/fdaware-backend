export const ROLES = ['ADMIN', 'REVIEWER', 'VIEWER'] as const;
export type Role = typeof ROLES[number];

export const DEFAULT_SKU_LIMIT = 5;
export const GROWTH_SKU_LIMIT = 20;
export const ENTERPRISE_SKU_LIMIT = 100;
export const LITE_SKU_LIMIT = 2;
