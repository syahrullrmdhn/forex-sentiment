exports.up = async function up(knex) {
  const hasCacheTable = await knex.schema.hasTable('eodhd_cache');
  if (!hasCacheTable) {
    await knex.schema.createTable('eodhd_cache', (table) => {
      table.string('symbol', 20).primary();
      table.string('pair', 20).notNullable();
      table.decimal('score', 6, 2).nullable();
      table.string('mood', 50).nullable();
      table.text('headlines').nullable();
      table.timestamp('cached_at').notNullable();
    });
  }

  const hasCounterTable = await knex.schema.hasTable('api_call_counter');
  if (!hasCounterTable) {
    await knex.schema.createTable('api_call_counter', (table) => {
      table.string('date', 10).primary();
      table.integer('count').notNullable().defaultTo(0);
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('api_call_counter');
  await knex.schema.dropTableIfExists('eodhd_cache');
};
