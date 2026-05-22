import dotenv from "dotenv";
import { getPool } from "../server/db.mjs";

dotenv.config({ path: ".env.local", override: true });

const pool = await getPool();
const tables = await pool.request().query(`
  select s.name as schema_name, t.name as table_name
  from sys.tables t
  join sys.schemas s on s.schema_id = t.schema_id
  order by s.name, t.name
`);

for (const table of tables.recordset) {
  const safeName = `[${table.schema_name}].[${table.table_name}]`;
  const count = await pool.request().query(`select count(*) as total from ${safeName}`);
  const total = count.recordset[0].total;
  if (total > 0) {
    console.log(`${table.schema_name}.${table.table_name}: ${total}`);
  }
}

await pool.close();
