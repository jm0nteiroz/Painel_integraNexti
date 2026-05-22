import sql from "mssql";

const poolPromises = new Map();

export function getDbConfig(database = process.env.DB_NAME) {
  return {
    server: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 1433),
    database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  };
}

export async function getPool() {
  return getPoolForDatabase(process.env.DB_NAME);
}

export async function getPoolForDatabase(database) {
  if (!poolPromises.has(database)) {
    const pool = new sql.ConnectionPool(getDbConfig(database));
    poolPromises.set(database, pool.connect());
  }

  return poolPromises.get(database);
}

export { sql };
