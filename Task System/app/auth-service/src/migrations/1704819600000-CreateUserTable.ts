import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateUserTable1704819600000 implements MigrationInterface {
  name = 'CreateUserTable1704819600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'username',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
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
        ],
      }),
      true,
    );

    // Create indexes for better performance
    await queryRunner.createIndex(
      'users',
      new Index('IDX_USER_EMAIL', ['email']),
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_USER_USERNAME', ['username']),
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_USER_ACTIVE', ['isActive']),
    );

    // Enable UUID extension if not exists
    await queryRunner.query(
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_USER_ACTIVE');
    await queryRunner.dropIndex('users', 'IDX_USER_USERNAME');
    await queryRunner.dropIndex('users', 'IDX_USER_EMAIL');
    await queryRunner.dropTable('users');
  }
}