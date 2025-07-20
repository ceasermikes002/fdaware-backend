import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { LabelModule } from '../labels/label.module';
import { ScanModule } from '../scan/scan.module';

@Module({
  imports: [LabelModule, ScanModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {} 