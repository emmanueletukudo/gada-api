import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  status(): string {
    const res = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(res);
  }
}
