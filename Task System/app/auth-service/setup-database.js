
const { Client } = require('pg');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

async function setupDatabase() {
  const dbConfig = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
  };

  const databaseName = process.env.DATABASE_NAME || 'challenge_db';

  console.log('🚀 Configurando banco de dados...');
  console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`👤 Usuário: ${dbConfig.user}`);
  console.log(`🗄️  Banco: ${databaseName}`);

  // Conectar ao PostgreSQL (sem especificar banco)
  const client = new Client({
    ...dbConfig,
    database: 'postgres', // Conectar ao banco padrão primeiro
  });

  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    await client.connect();

    // Verificar se o banco já existe
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );

    if (result.rows.length === 0) {
      console.log(`📚 Criando banco de dados '${databaseName}'...`);
      await client.query(`CREATE DATABASE "${databaseName}"`);
      console.log('✅ Banco criado com sucesso!');
    } else {
      console.log('✅ Banco já existe!');
    }

    // Habilitar extensão UUID no novo banco
    console.log('🔧 Conectando ao banco criado...');
    await client.end();
    
    const dbClient = new Client({
      ...dbConfig,
      database: databaseName,
    });
    
    await dbClient.connect();
    console.log('🆔 Habilitando extensão UUID...');
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ Extensão UUID habilitada!');
    
    await dbClient.end();
    console.log('✅ Setup do banco concluído!');
    console.log('🎯 Agora execute as migrations com: npm run migration:run');

  } catch (error) {
    console.error('❌ Erro durante o setup do banco:', error);
    process.exit(1);
  }
}

setupDatabase();
