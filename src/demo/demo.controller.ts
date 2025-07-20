import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DemoService } from './demo.service';
import { RateLimitGuard } from './rate-limit.guard';

@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post('scan')
  @UseGuards(RateLimitGuard)
  @UseInterceptors(FileInterceptor('file'))
  async demoScan(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.demoService.handleDemoScan(file);
  }
} 