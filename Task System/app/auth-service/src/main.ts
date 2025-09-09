import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppDataSource } from './data/data-source';

async function bootstrap() {
  try {
    // Inicializa a conexão com o banco
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();

    // Inicia a aplicação
    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);
  } catch (error) {
    console.error('Erro ao inicializar:', error);
  }
}
bootstrap();
