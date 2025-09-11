export interface EnvironmentVariables {
  // General
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // Database
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;

  // JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRE: string;
  JWT_REFRESH_EXPIRE: string;

  // RabbitMQ
  RABBITMQ_HOST: string;
  RABBITMQ_PORT: number;
  RABBITMQ_USER: string;
  RABBITMQ_PASSWORD: string;
  RABBITMQ_QUEUE: string;

  // Redis
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_DATABASE?: number;
  REDIS_TTL?: number;
}

export const environmentConfig = () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT!, 10),

  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT!, 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpire: process.env.JWT_ACCESS_EXPIRE,
    refreshExpire: process.env.JWT_REFRESH_EXPIRE,
  },

  rabbitmq: {
    host: process.env.RABBITMQ_HOST,
    port: parseInt(process.env.RABBITMQ_PORT!, 10),
    user: process.env.RABBITMQ_USER,
    password: process.env.RABBITMQ_PASSWORD,
    queue: process.env.RABBITMQ_QUEUE,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DATABASE || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '900', 10), // 15 minutos
  },
});
