import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Redis } from 'ioredis';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redisClient: Redis) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { body?: any }>();

    const headerKey = (request.headers.get?.('idempotency-key') as string | undefined) ?? null;
    const bodyKey = (request.body?.clientReference as string | undefined) ?? null;
    const idempotencyKey = headerKey ?? bodyKey;

    if (!idempotencyKey) {
      return next.handle();
    }

    const cacheKey = `idem:${idempotencyKey}`;
    const existing = await this.redisClient.get(cacheKey);

    if (existing) {
      return of(JSON.parse(existing));
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.redisClient.set(cacheKey, JSON.stringify(response), 'EX', 60 * 30);
      }),
    );
  }
}

