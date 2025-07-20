import { Module } from '@nestjs/common';
import { ScanService } from './scan.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [ScanService],
  exports: [ScanService],
})
export class ScanModule {} 