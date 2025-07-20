import { CanActivate, ExecutionContext, Injectable, HttpException } from '@nestjs/common';

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ipRequests: Record<string, { count: number; firstRequest: number }> = {};

@Injectable()
export class RateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const now = Date.now();
    if (!ipRequests[ip] || now - ipRequests[ip].firstRequest > WINDOW_MS) {
      ipRequests[ip] = { count: 1, firstRequest: now };
      return true;
    }
    if (ipRequests[ip].count >= RATE_LIMIT) {
      throw new HttpException('Too many demo scans from this IP. Please try again later.', 429);
    }
    ipRequests[ip].count++;
    return true;
  }
} 