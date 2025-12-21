import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CONFIG } from '../config/stripe.config';
import { PLAN_LIMITS, planFromPriceId } from './plan.config';

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function startOfNextMonth(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return d;
}

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = STRIPE_CONFIG.secretKey ? new Stripe(STRIPE_CONFIG.secretKey, { apiVersion: '2024-06-20' }) : null;
  }

  private async alreadyProcessed(eventId: string) {
    const exists = await this.prisma.stripeEvent.findUnique({ where: { id: eventId } });
    if (exists) return true;
    await this.prisma.stripeEvent.create({ data: { id: eventId, type: 'RECEIVED' } });
    return false;
  }

  private async updateWorkspaceFromSubscription(workspaceId: string, sub: Stripe.Subscription) {
    const primaryItem = sub.items?.data?.[0];
    const price = (primaryItem?.price as any) || undefined;
    const priceId = (price && price.id) || undefined;
    const rawInterval = (price && price.recurring && price.recurring.interval) || undefined;
    const interval = rawInterval === 'month' ? 'MONTH' : rawInterval === 'year' ? 'YEAR' : undefined;
    const plan = planFromPriceId(priceId) || 'LITE';
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan,
        planExpiresAt: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        stripeCustomerId: (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id) || null,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId || null,
        billingInterval: interval || null,
        billingStatus: 'ACTIVE',
      } as any,
    });
  }

  private async findWorkspaceIdForSubscription(sub: Stripe.Subscription) {
    const metaWs = (sub.metadata && (sub.metadata as any).workspaceId) || undefined;
    if (metaWs) return metaWs as string;
    const customerId = (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id) || undefined;
    const existing = await this.prisma.workspace.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: sub.id },
          customerId ? { stripeCustomerId: customerId } : { id: '' },
        ],
      } as any,
    });
    return existing?.id || null;
  }

  async createCheckoutSession(input: { workspaceId?: string; userId?: string; successUrl: string; cancelUrl: string; customerEmail?: string; plan?: 'LITE' | 'TEAM' | 'SCALE'; }) {
    if (!this.stripe) throw new Error('Stripe is not configured');
    const { workspaceId, userId, successUrl, cancelUrl, customerEmail, plan } = input;
    const clientRef = workspaceId || userId || undefined;
    const priceId = plan === 'TEAM' ? STRIPE_CONFIG.teamPriceId : plan === 'SCALE' ? STRIPE_CONFIG.scalePriceId : STRIPE_CONFIG.litePriceId;
    if (!priceId) throw new Error('Stripe price id is not configured');
    if (workspaceId) {
      const existing = await this.prisma.workspace.findFirst({ where: { id: workspaceId } });
      if (existing?.stripeSubscriptionId && existing.stripeCustomerId) {
        try {
          const sub = await this.stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
          if (sub && sub.status !== 'canceled') {
            const portal = await this.stripe.billingPortal.sessions.create({
              customer: existing.stripeCustomerId,
              return_url: successUrl,
            });
            return { id: null, url: portal.url };
          }
        } catch {}
      }
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: clientRef,
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { workspaceId: workspaceId || '', userId: userId || '' },
      },
      metadata: { workspaceId: workspaceId || '', userId: userId || '' },
    });
    return { id: session.id, url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
  if (!this.stripe) throw new Error('Stripe is not configured');
  if (!STRIPE_CONFIG.webhookSecret) {
    throw new Error('Stripe webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_CONFIG.webhookSecret,
    );
  } catch (err) {
    console.error('Invalid Stripe signature:', err);
    throw new Error('Invalid Stripe signature');
  }

  // Idempotency
  const skipped = event.id ? await this.alreadyProcessed(event.id) : false;
  if (skipped) return { received: true, skipped: true };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId = (typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as any)?.id) as string | undefined;
      if (subId) {
        const sub = await this.stripe.subscriptions.retrieve(subId);
        const workspaceId = (session.metadata as any)?.workspaceId || (sub.metadata as any)?.workspaceId || (session.client_reference_id as string | undefined) || (await this.findWorkspaceIdForSubscription(sub));
        if (workspaceId) {
          await this.updateWorkspaceFromSubscription(workspaceId, sub);
        }
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = (sub.metadata as any)?.workspaceId || (await this.findWorkspaceIdForSubscription(sub));
      if (workspaceId) {
        await this.updateWorkspaceFromSubscription(workspaceId, sub);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = (sub.metadata as any)?.workspaceId || (await this.findWorkspaceIdForSubscription(sub));
      if (workspaceId) {
        const end = sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date();
        await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            planExpiresAt: end,
            stripeSubscriptionId: sub.id,
            stripeCustomerId: (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id) || null,
            billingStatus: 'CANCELED',
          } as any,
        });
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (typeof invoice.subscription === 'string'
        ? (invoice.subscription as string)
        : (invoice.subscription as any)?.id) as string | undefined;
      if (subId) {
        const sub = await this.stripe.subscriptions.retrieve(subId);
        const workspaceId = (sub.metadata as any)?.workspaceId || (await this.findWorkspaceIdForSubscription(sub));
        if (workspaceId) {
          await this.updateWorkspaceFromSubscription(workspaceId, sub);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (typeof invoice.subscription === 'string'
        ? (invoice.subscription as string)
        : (invoice.subscription as any)?.id) as string | undefined;
      if (subId) {
        const sub = await this.stripe.subscriptions.retrieve(subId);
        const workspaceId = (sub.metadata as any)?.workspaceId || (await this.findWorkspaceIdForSubscription(sub));
        if (workspaceId) {
          await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { billingStatus: 'PAST_DUE' } as any,
          });
        }
      }
      break;
    }

    default: {
      console.log(`Unhandled Stripe event: ${event.type}`);
    }
  }

  return { received: true };
  }


  async assertCanScan(workspaceId: string) {
    if (!workspaceId) throw new Error('Workspace is required');

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace not found');

    const demoWorkspaceId = process.env.DEMO_WORKSPACE_ID;
    if (demoWorkspaceId && workspaceId === demoWorkspaceId) return;

    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = startOfNextMonth(now);

    const distinctLabels = await this.prisma.labelVersion.findMany({
      where: {
        analyzedAt: { gte: periodStart, lt: periodEnd },
        label: { workspaceId, isDemo: false },
      },
      distinct: ['labelId'],
      select: { labelId: true },
    } as any);
    const usageCount = distinctLabels.length;
    const plan = (workspace as any).plan as 'LITE' | 'TEAM' | 'SCALE';
    const limit = PLAN_LIMITS[plan].skuPerMonth;
    if (usageCount >= limit) {
      throw new Error('Plan limit reached for monthly SKUs');
    }

    const expiresAt: Date | null = (workspace as any).planExpiresAt || null;
    if (!expiresAt || expiresAt <= now) {
      throw new Error('Active subscription required to scan labels');
    }
  }

  async getWorkspaceBillingStatus(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace not found');
    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd = startOfNextMonth(now);
    const distinctLabels = await this.prisma.labelVersion.findMany({
      where: {
        analyzedAt: { gte: periodStart, lt: periodEnd },
        label: { workspaceId, isDemo: false },
      },
      distinct: ['labelId'],
      select: { labelId: true },
    } as any);
    const usageCount = distinctLabels.length;
    let planPriceAmount: number | null = null;
    let planPriceCurrency: string | null = null;
    let planPriceInterval: string | null = null;
    let planNickname: string | null = null;
    if (workspace.stripePriceId && this.stripe) {
      try {
        const price = await this.stripe.prices.retrieve(workspace.stripePriceId);
        planPriceAmount = price.unit_amount ?? null;
        planPriceCurrency = price.currency ?? null;
        planPriceInterval = price.recurring?.interval ?? null;
        planNickname = price.nickname ?? null;
      } catch {}
    }
    const subscriptionActive = !!workspace.planExpiresAt && workspace.planExpiresAt > now;
    const plan = (workspace as any).plan as 'LITE' | 'TEAM' | 'SCALE';
    const usageLimit = PLAN_LIMITS[plan].skuPerMonth;
    return {
      plan: (workspace as any).plan,
      planExpiresAt: workspace.planExpiresAt,
      billingStatus: (workspace as any).billingStatus || null,
      stripeCustomerId: workspace.stripeCustomerId || null,
      stripeSubscriptionId: workspace.stripeSubscriptionId || null,
      stripePriceId: workspace.stripePriceId || null,
      billingInterval: (workspace as any).billingInterval || null,
      usageCount,
      usageLimit,
      subscriptionActive,
      planPriceAmount,
      planPriceCurrency,
      planPriceInterval,
      planNickname,
    };
  }

  async createBillingPortalSession(input: { workspaceId: string; returnUrl: string }) {
    if (!this.stripe) throw new Error('Stripe is not configured');
    const { workspaceId, returnUrl } = input;
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace not found');
    if (!workspace.stripeCustomerId) throw new Error('No Stripe customer for workspace');
    const portal = await this.stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: portal.url };
  }

  async cancelSubscription(input: { workspaceId: string; immediate?: boolean; cancelAtPeriodEnd?: boolean }) {
    if (!this.stripe) throw new Error('Stripe is not configured');
    const { workspaceId, immediate, cancelAtPeriodEnd } = input;
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace not found');
    if (!workspace.stripeSubscriptionId) throw new Error('No Stripe subscription for workspace');
    let endDate: Date | null = null;
    if (immediate) {
      const sub = await this.stripe.subscriptions.cancel(workspace.stripeSubscriptionId);
      endDate = sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date();
    } else {
      const sub = await this.stripe.subscriptions.update(workspace.stripeSubscriptionId, { cancel_at_period_end: cancelAtPeriodEnd ?? true });
      endDate = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
    }
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { planExpiresAt: endDate, billingStatus: 'CANCELED' } as any,
    });
    return { canceled: true, endDate };
  }
}
