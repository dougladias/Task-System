# 🔐 Auth Service - Sistema de Autenticação

Microserviço de autenticação para o **Task System**, desenvolvido com **NestJS**, **TypeORM**, **PostgreSQL** e **RabbitMQ**.

## 🚀 Funcionalidades

- ✅ **Autenticação JWT** (Access Token + Refresh Token)
- ✅ **Registro e Login** de usuários
- ✅ **Hash de senhas** com bcrypt
- ✅ **Microserviço RabbitMQ** para comunicação entre serviços
- ✅ **Rate Limiting** (10 req/seg)
- ✅ **Swagger/OpenAPI** documentação automática
- ✅ **Migrations** automáticas do banco de dados
- ✅ **Testes** unitários e E2E
- ✅ **Guards JWT** para proteção de rotas
- ✅ **Validação**: class-validator + class-transformer
- ✅ **Health Checks** para monitoramento
- ✅ **Logging** estruturado com Pino

## 📋 Pré-requisitos

- Node.js 20+
- PostgreSQL 17+ (rodando na porta 5432)
- RabbitMQ 3.13+ (rodando na porta 5672)

## ⚡ Quick Start

### 1. **Instalar dependências:**
```bash
npm install
```

### 2. **Configurar variáveis de ambiente:**
```bash
# Copie o arquivo .env.example ou configure manualmente:
NODE_ENV=development
PORT=3002

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=sua-senha
DATABASE_NAME=challenge_db

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro
JWT_REFRESH_SECRET=seu-refresh-secret-super-seguro
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=admin
RABBITMQ_QUEUE=auth_queue
```

### 3. **Configurar banco de dados (automático):**
```bash
# Cria banco + executa migrations + inicia serviço
npm run start:full

# OU executar etapas separadamente:
npm run db:setup      # Criar banco e executar migrations
npm start             # Iniciar serviço
```

### 4. **Acessar a aplicação:**
- **API**: http://localhost:3002
- **Swagger**: http://localhost:3002/api/docs

## 📚 Comandos Disponíveis

### **Desenvolvimento:**
```bash
npm start                    # Iniciar serviço
npm run start:dev           # Modo watch (desenvolvimento)
npm run start:debug         # Modo debug
npm run start:full          # Setup completo + iniciar
```

### **Banco de Dados:**
```bash
npm run db:setup            # Setup completo (criar banco + migrations)
npm run db:create           # Criar banco de dados
npm run db:migrate          # Executar migrations

npm run migration:run       # Executar migrations pendentes
npm run migration:generate  # Gerar nova migration
npm run migration:create    # Criar migration vazia
npm run migration:revert    # Reverter última migration
npm run migration:show      # Mostrar status das migrations
```

### **Testes:**
```bash
npm test                    # Testes unitários
npm run test:watch         # Testes em modo watch
npm run test:cov          # Testes com coverage
npm run test:e2e          # Testes end-to-end
```

### **Build e Produção:**
```bash
npm run build              # Build para produção
npm run start:prod        # Iniciar em modo produção
```

## 🔌 API Endpoints

### **Autenticação**

#### **POST** `/auth/register`
Registrar novo usuário.

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "username",
    "isActive": true,
    "createdAt": "2025-09-11T08:35:50.000Z"
  }
}
```

#### **POST** `/auth/login`
Fazer login.

```json
{
  "emailOrUsername": "user@example.com",
  "password": "password123"
}
```

#### **POST** `/auth/refresh`
Renovar access token.

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **Usuários**

#### **GET** `/users`
Listar usuários (protegido por JWT).

#### **GET** `/users/:id`
Buscar usuário por ID (protegido por JWT).

#### **PATCH** `/users/:id`
Atualizar usuário (protegido por JWT).

#### **DELETE** `/users/:id`
Deletar usuário (protegido por JWT).

## 🔄 Microserviços RabbitMQ

O auth-service expõe os seguintes **message patterns**:

### **`validate_token`**
Valida um JWT token.

```json
{
  "cmd": "validate_token",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response:**
```json
{
  "isValid": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "username",
    "isActive": true
  }
}
```

### **`get_user_by_id`**
Busca usuário por ID.

```json
{
  "cmd": "get_user_by_id",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## 🔐 Segurança

- **Passwords**: Hash com bcrypt (salt rounds: 12)
- **JWT Tokens**: 
  - Access Token: 15 minutos
  - Refresh Token: 7 dias
- **Rate Limiting**: 10 requests/segundo
- **Validation**: Todas as entradas são validadas
- **CORS**: Configurado para frontend (localhost:3000)

## 🐳 Docker

### **Para desenvolvimento:**
```bash
# Executar apenas PostgreSQL e RabbitMQ
docker-compose -f docker-compose.dev.yml up -d
```

### **Para produção:**
```bash
# Build da imagem
docker build -t auth-service .

# Executar container
docker run -p 3002:3002 \
  -e DATABASE_HOST=localhost \
  -e RABBITMQ_HOST=localhost \
  auth-service
```

## 📂 Estrutura de Arquivos

```
src/
├── auth/                   # Módulo de autenticação
│   ├── controller/        # Controllers REST e Microservice
│   ├── dto/              # DTOs de validação
│   ├── guards/           # Guards JWT
│   ├── service/          # Lógica de negócio
│   └── strategies/       # Estratégias Passport JWT
├── users/                 # Módulo de usuários
│   ├── controller/       # Controller de usuários
│   ├── dto/             # DTOs de usuários
│   ├── entities/        # Entity User (TypeORM)
│   └── service/         # Service de usuários
├── config/               # Configurações
├── data/                # Configuração do banco
└── migrations/          # Migrations do banco

test/                     # Testes E2E
├── app.e2e-spec.ts
└── jest-e2e.json
```
## 📝 TODO

- [ ] Implementar reset de senha
- [x] Implementar audit logs
- [x] Adicionar cache com Redis
- [x] Melhorar cobertura de testes
- [x] Implementar health checks

## 🏥 Health Checks

O serviço inclui endpoints de saúde para monitoramento em produção:

### **GET** `/health`
Verificação completa da saúde do serviço.

**Response (Sucesso):**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "rabbitmq": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "rabbitmq": { "status": "up" }
  }
}
```

### **GET** `/health/ready`
Verifica se o serviço está pronto para receber requisições.

### **GET** `/health/live`
Verifica se o serviço está funcionando (liveness probe).

## 📄 Licença

Este projeto está sob a licença Douglas Dias.

---

**Desenvolvido com ❤️ para a Globoo**