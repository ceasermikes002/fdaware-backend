import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import {
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateCheckoutSessionBody {
  @ApiProperty({
    description: 'Workspace ID to associate subscription',
    example: 'workspace_123',
  })
  @IsString()
  workspaceId!: string;

  @ApiProperty({
    description: 'Redirect URL after successful checkout',
    example: 'https://app.example.com/billing/success',
  })
  @IsUrl()
  successUrl!: string;

  @ApiProperty({
    description: 'Redirect URL if user cancels checkout',
    example: 'https://app.example.com/billing/cancel',
  })
  @IsUrl()
  cancelUrl!: string;

  @ApiProperty({
    description: 'Customer email for Stripe session',
    required: false,
    example: 'user@company.com',
  })
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({
    description: 'Plan to purchase (LITE, TEAM, SCALE)',
    required: false,
    example: 'TEAM',
  })
  @IsOptional()
  @IsString()
  plan?: 'LITE' | 'TEAM' | 'SCALE';
}

class CreatePortalSessionBody {
  @ApiProperty({ description: 'Workspace ID', example: 'workspace_123' })
  @IsString()
  workspaceId!: string;

  @ApiProperty({
    description: 'Return URL after portal exit',
    example: 'https://app.example.com/billing',
  })
  @IsUrl()
  returnUrl!: string;
}

class CancelSubscriptionBody {
  @ApiProperty({ description: 'Workspace ID', example: 'workspace_123' })
  @IsString()
  workspaceId!: string;

  @ApiProperty({
    description: 'Cancel immediately',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;

  @ApiProperty({
    description: 'Cancel at period end',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;
}

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('create-checkout-session')
  @ApiOperation({
    summary: 'Create Stripe checkout session for Lite subscription',
  })
  @ApiBody({ type: CreateCheckoutSessionBody })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  async createCheckout(@Body() body: CreateCheckoutSessionBody) {
    const { workspaceId, successUrl, cancelUrl, customerEmail, plan } = body;
    return this.billing.createCheckoutSession({
      workspaceId,
      successUrl,
      cancelUrl,
      customerEmail,
      plan,
    });
  }

  @Post('create-portal-session')
  @ApiOperation({ summary: 'Create Stripe Billing Portal session' })
  @ApiBody({ type: CreatePortalSessionBody })
  @ApiResponse({ status: 201, description: 'Billing Portal session created' })
  async createPortal(@Body() body: CreatePortalSessionBody) {
    const { workspaceId, returnUrl } = body;
    return this.billing.createBillingPortalSession({ workspaceId, returnUrl });
  }

  @Post('cancel-subscription')
  @ApiOperation({ summary: 'Cancel subscription (immediate or at period end)' })
  @ApiBody({ type: CancelSubscriptionBody })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancellation invoked',
  })
  async cancel(@Body() body: CancelSubscriptionBody) {
    const { workspaceId, immediate, cancelAtPeriodEnd } = body;
    return this.billing.cancelSubscription({
      workspaceId,
      immediate,
      cancelAtPeriodEnd,
    });
  }

  @Post('webhook')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @HttpCode(200)
  async webhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }
    try {
      const rawBody: Buffer = req.body as Buffer;
      return await this.billing.handleWebhook(rawBody, signature);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('Invalid Stripe signature')) {
        throw new BadRequestException('Invalid Stripe signature');
      }
      if (msg.includes('Stripe webhook secret not configured')) {
        throw new BadRequestException('Stripe webhook secret not configured');
      }
      if (msg.includes('Stripe is not configured')) {
        throw new BadRequestException('Stripe secret key not configured');
      }
      throw e;
    }
  }

  @Post('workspace-status')
  @ApiOperation({ summary: 'Get workspace billing status' })
  @ApiBody({ schema: { properties: { workspaceId: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Workspace billing status' })
  async workspaceStatus(@Body('workspaceId') workspaceId: string) {
    return this.billing.getWorkspaceBillingStatus(workspaceId);
  }
}
