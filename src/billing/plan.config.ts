type PlanName = 'LITE' | 'TEAM' | 'SCALE'

function envInt(name: string, def: number): number {
  const v = process.env[name]
  if (!v) return def
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : def
}

export const PRICE_IDS: Record<PlanName, string> = {
  LITE: process.env.STRIPE_LITE_PRICE_ID || '',
  TEAM: process.env.STRIPE_TEAM_PRICE_ID || '',
  SCALE: process.env.STRIPE_SCALE_PRICE_ID || '',
}

export const PLAN_LIMITS: Record<PlanName, { skuPerMonth: number; usersPerWorkspace: number; workspacesPerAccount: number }> = {
  LITE: {
    skuPerMonth: envInt('PLAN_SKU_LIMIT_LITE', 2),
    usersPerWorkspace: envInt('PLAN_USER_LIMIT_LITE', 1),
    workspacesPerAccount: envInt('PLAN_WORKSPACE_LIMIT_LITE', 1),
  },
  TEAM: {
    skuPerMonth: envInt('PLAN_SKU_LIMIT_TEAM', 10),
    usersPerWorkspace: envInt('PLAN_USER_LIMIT_TEAM', 3),
    workspacesPerAccount: envInt('PLAN_WORKSPACE_LIMIT_TEAM', 5),
  },
  SCALE: {
    skuPerMonth: envInt('PLAN_SKU_LIMIT_SCALE', 25),
    usersPerWorkspace: envInt('PLAN_USER_LIMIT_SCALE', 10),
    workspacesPerAccount: envInt('PLAN_WORKSPACE_LIMIT_SCALE', 999999),
  },
}

export function planFromPriceId(priceId?: string): PlanName | null {
  if (!priceId) return null
  const entries = Object.entries(PRICE_IDS) as [PlanName, string][]
  for (const [plan, id] of entries) {
    if (id && id === priceId) return plan
  }
  return null
}

