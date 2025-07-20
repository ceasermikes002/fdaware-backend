import { Module } from '@nestjs/common';
import { VersionService } from './version.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VersionService],
  exports: [VersionService],
})
export class VersionModule {} 