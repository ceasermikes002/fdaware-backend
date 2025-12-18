export const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publicKey: process.env.STRIPE_PUBLIC_KEY || '',
  litePriceId: process.env.STRIPE_LITE_PRICE_ID || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};
