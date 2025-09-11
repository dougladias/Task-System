import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export const getCacheConfig = () =>
  CacheModule.registerAsync({
    useFactory: async (configService: ConfigService) => {
      const store = await redisStore({
        socket: {
          host: configService.get('redis.host', 'localhost'),
          port: configService.get('redis.port', 6379),
        },
        password: configService.get('redis.password'),
        database: configService.get('redis.database', 0),
      });

      return {
        store,
        ttl: configService.get('redis.ttl', 60 * 15), // 15 minutos default
        max: configService.get('redis.max', 100), // máximo 100 itens
      };
    },
    inject: [ConfigService],
    isGlobal: true,
  });
