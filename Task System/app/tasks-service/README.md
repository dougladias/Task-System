# Tasks Service

## Descrição

O Tasks Service é um microserviço desenvolvido em NestJS responsável pela gestão de tarefas no Sistema de Gestão de Tarefas Colaborativo. Ele fornece funcionalidades de CRUD para tarefas, incluindo comentários e histórico de alterações, e se integra com outros serviços via RabbitMQ para notificações em tempo real.

## Funcionalidades

- **CRUD de Tarefas**: Criar, ler, atualizar e deletar tarefas com campos como título, descrição, prazo, prioridade (LOW, MEDIUM, HIGH, URGENT) e status (TODO, IN_PROGRESS, REVIEW, DONE).
- **Atribuição de Usuários**: Atribuir tarefas a múltiplos usuários.
- **Comentários**: Adicionar e listar comentários em tarefas.
- **Histórico de Alterações**: Manter um log de auditoria simplificado para alterações nas tarefas.
- **Integração com RabbitMQ**: Publicar eventos como `task.created`, `task.updated` e `task.comment.created` para notificações.

## Tecnologias Utilizadas

- **NestJS**: Framework para construção de aplicações server-side eficientes.
- **TypeORM**: ORM para interação com o banco de dados PostgreSQL.
- **PostgreSQL**: Banco de dados relacional.
- **RabbitMQ**: Message broker para comunicação assíncrona entre serviços.
- **Docker**: Containerização para facilitar o desenvolvimento e deployment.

## Estrutura do Projeto

```
src/
├── app.controller.ts       # Controlador principal
├── app.module.ts           # Módulo principal
├── app.service.ts          # Serviço principal
├── main.ts                 # Ponto de entrada da aplicação
├── migrations/             # Migrations do TypeORM
├── tasks/                  # Módulo de tarefas (a ser implementado)
├── comments/               # Módulo de comentários (a ser implementado)
└── audit/                  # Módulo de auditoria (a ser implementado)
```

## Como Executar

Este serviço faz parte de um monorepo gerenciado pelo Turborepo. Para executar o projeto completo, incluindo este serviço, siga os passos abaixo a partir da raiz do projeto (`Task System/`):

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Executar com Docker Compose**:
   ```bash
   docker-compose up --build
   ```

   Isso iniciará todos os serviços, incluindo o tasks-service na porta 3003.

3. **Executar apenas este serviço em modo desenvolvimento** (opcional):
   ```bash
   cd app/tasks-service
   npm run start:dev
   ```

## Endpoints Internos

Como microserviço, os endpoints HTTP são expostos via API Gateway. Os endpoints internos incluem:

- `POST /tasks`: Criar tarefa
- `GET /tasks/:id`: Obter tarefa por ID
- `PUT /tasks/:id`: Atualizar tarefa
- `DELETE /tasks/:id`: Deletar tarefa
- `POST /tasks/:id/comments`: Adicionar comentário
- `GET /tasks/:id/comments`: Listar comentários

## Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

- `DATABASE_URL`: URL de conexão com PostgreSQL
- `RABBITMQ_URL`: URL de conexão com RabbitMQ
- `JWT_SECRET`: Segredo para JWT (se necessário para validação interna)

## Como Implementar

Para implementar as funcionalidades:

1. **Configurar TypeORM**: Definir entidades para Task, Comment, User, etc.
2. **Implementar Módulos**: Criar módulos para tasks, comments e audit.
3. **Integração com RabbitMQ**: Usar @nestjs/microservices para publicar eventos.
4. **Migrations**: Criar e executar migrations para o banco de dados.
5. **Testes**: Adicionar testes unitários e e2e.

## Contribuição

Siga os padrões do projeto:

- Use TypeScript.
- Implemente DTOs com class-validator.
- Mantenha cobertura de testes.
- Documente APIs com Swagger no Gateway.

## Licença

Este projeto é parte do desafio da Globoo e segue a licença do projeto principal.
