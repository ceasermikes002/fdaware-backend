import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VersionService {
  constructor(private prisma: PrismaService) {}
  // TODO: Implement label version CRUD
} 