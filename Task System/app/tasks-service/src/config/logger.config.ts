import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

export const getLoggerConfig = () =>
  LoggerModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      pinoHttp: {
        transport:
          config.get('NODE_ENV') === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                  singleLine: true,
                  messageFormat: '{levelLabel} - {msg}',
                },
              }
            : undefined,
        level: config.get('NODE_ENV') === 'development' ? 'debug' : 'info',
        autoLogging: true,
      },
    }),
  });