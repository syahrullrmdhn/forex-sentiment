exports.up = async function up(knex) {
  const hasUsersTable = await knex.schema.hasTable('users');

  if (!hasUsersTable) {
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username', 80).notNullable().unique();
      table.string('email', 160).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasSentimentsTable = await knex.schema.hasTable('sentiments');

  if (!hasSentimentsTable) {
    await knex.schema.createTable('sentiments', (table) => {
      table.increments('id').primary();
      table.string('pair', 20).notNullable();
      table.string('source', 50).notNullable();
      table.string('type', 50).notNullable();
      table.decimal('long_pct', 6, 2).nullable();
      table.decimal('short_pct', 6, 2).nullable();
      table.decimal('score', 6, 2).nullable();
      table.text('headline').nullable();
      table.bigInteger('timestamp').notNullable();
      table.index(['pair', 'source', 'type', 'timestamp'], 'sentiments_pair_source_type_timestamp_idx');
    });
  }

  const hasPricesTable = await knex.schema.hasTable('prices');

  if (!hasPricesTable) {
    await knex.schema.createTable('prices', (table) => {
      table.increments('id').primary();
      table.string('pair', 20).notNullable();
      table.decimal('price', 16, 6).notNullable();
      table.bigInteger('timestamp').notNullable();
      table.index(['pair', 'timestamp'], 'prices_pair_timestamp_idx');
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('prices');
  await knex.schema.dropTableIfExists('sentiments');
  await knex.schema.dropTableIfExists('users');
};
