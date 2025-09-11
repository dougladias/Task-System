import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ICacheService } from '../interfaces/cache.interface';

@Injectable()
export class CacheService implements ICacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: any) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const result = await this.cacheManager.get(key);
      return result as T;
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.cacheManager.set(key, value, ttl);
      } else {
        await this.cacheManager.set(key, value);
      }
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache del error for key ${key}:`, error);
    }
  }
}
