import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ViolationService {
  constructor(private prisma: PrismaService) {}
  // TODO: Implement violation CRUD
} 