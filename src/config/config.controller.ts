import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { emailTransporter, EMAIL_FROM } from './email.config';

@ApiTags('config')
@ApiBearerAuth()
@Controller('config')
export class ConfigController {
  @Get('email-health')
  @ApiOperation({ summary: 'Verify SMTP transporter connectivity' })
  async emailHealth() {
    try {
      await emailTransporter.verify();
      return { ok: true, from: EMAIL_FROM };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  }
}
