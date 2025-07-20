import { Module } from '@nestjs/common';
import { ViolationService } from './violation.service';
import { ViolationController } from './violation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ViolationService],
  controllers: [ViolationController],
  exports: [ViolationService],
})
export class ViolationModule {} 