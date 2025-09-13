import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNotificationsTable1736548000000
  implements MigrationInterface
{
  name = 'CreateNotificationsTable1736548000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum types
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'task_created',
        'task_updated',
        'task_assigned',
        'task_status_changed',
        'comment_added'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_status_enum" AS ENUM (
        'pending',
        'sent',
        'read',
        'failed'
      )
    `);

    // Criar tabela notifications
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'notification_type_enum',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'notification_status_enum',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'taskId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'taskTitle',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'triggeredBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'triggeredByUsername',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'readAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sentAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
    );

    // Criar índices para performance
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_taskId',
        columnNames: ['taskId'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_userId_status',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
    await queryRunner.query('DROP TYPE "notification_status_enum"');
    await queryRunner.query('DROP TYPE "notification_type_enum"');
  }
}
