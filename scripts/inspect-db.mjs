import "dotenv/config";
import dotenv from "dotenv";
import { getPool } from "../server/db.mjs";

dotenv.config({ path: ".env.local", override: true });

const pool = await getPool();

const tables = await pool.request().query(`
  select
    s.name as schema_name,
    t.name as table_name
  from sys.tables t
  inner join sys.schemas s on s.schema_id = t.schema_id
  order by s.name, t.name
`);

console.log("Tabelas encontradas:");
for (const table of tables.recordset) {
  console.log(`- ${table.schema_name}.${table.table_name}`);
}

const logLikeTables = tables.recordset.filter((table) =>
  /log|erro|error|retorno|return|process|exec|integr/i.test(table.table_name),
);

if (logLikeTables.length === 0) {
  console.log("\nNao encontrei tabelas com nome parecido com log/erro/retorno/processamento.");
  process.exit(0);
}

console.log("\nPossiveis tabelas de logs:");
for (const table of logLikeTables) {
  console.log(`\n${table.schema_name}.${table.table_name}`);
  const columns = await pool.request()
    .input("schema", table.schema_name)
    .input("table", table.table_name)
    .query(`
      select
        c.name as column_name,
        ty.name as data_type,
        c.max_length,
        c.is_nullable
      from sys.columns c
      inner join sys.types ty on ty.user_type_id = c.user_type_id
      inner join sys.tables t on t.object_id = c.object_id
      inner join sys.schemas s on s.schema_id = t.schema_id
      where s.name = @schema and t.name = @table
      order by c.column_id
    `);

  for (const column of columns.recordset) {
    console.log(`  - ${column.column_name} (${column.data_type})`);
  }
}

await pool.close();
