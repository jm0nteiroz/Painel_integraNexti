import dotenv from "dotenv";
import express from "express";
import { authenticateToken, canAccessDatabase, createClient, createUser, ensureAuthStore, listClients, listUsers, login, logout, updateClient, updateUser } from "./auth.mjs";
import { getPool, getPoolForDatabase, sql } from "./db.mjs";
import { integrationMappings } from "./logMappings.mjs";
import { msNextiOperations } from "./msNextiOperations.mjs";

dotenv.config({ path: ".env.local", override: true });
await ensureAuthStore();

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json());
app.use((request, response, next) => {
  const requestOrigin = request.headers.origin;
  const allowAnyOrigin = allowedOrigins.length === 0;
  const allowedOrigin = allowAnyOrigin || (requestOrigin && allowedOrigins.includes(requestOrigin))
    ? requestOrigin
    : allowedOrigins[0];
  response.setHeader("Access-Control-Allow-Origin", allowedOrigin ?? "*");
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});

app.get("/", (_request, response) => {
  response.json({
    ok: true,
    service: "Painel_integraNexti API",
    status: "online",
  });
});

app.get(["/health", "/api/public-health"], (_request, response) => {
  response.json({
    ok: true,
    service: "Painel_integraNexti API",
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/auth/login", async (request, response) => {
  try {
    const result = await login(request.body?.email, request.body?.password);
    if (!result) {
      response.status(401).json({ message: "Credenciais inválidas." });
      return;
    }
    response.json(result);
  } catch (error) {
    sendError(response, error);
  }
});

app.use("/api", async (request, response, next) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = token ? await authenticateToken(token) : null;
  if (!user) {
    response.status(401).json({ message: "Sessão inválida ou expirada." });
    return;
  }
  request.user = user;
  request.token = token;
  next();
});

app.get("/api/auth/me", (request, response) => {
  response.json({ user: request.user });
});

app.post("/api/auth/logout", (request, response) => {
  logout(request.token);
  response.json({ ok: true });
});

app.get("/api/users", requireAdmin, async (_request, response) => {
  response.json(await listUsers());
});

app.post("/api/users", requireAdmin, async (request, response) => {
  try {
    response.status(201).json(await createUser(request.body));
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
});

app.put("/api/users/:id", requireAdmin, async (request, response) => {
  try {
    response.json(await updateUser(request.params.id, request.body));
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
});

app.get("/api/clients", async (request, response) => {
  const clients = await listClients();
  if (request.user.role === "admin") {
    response.json(clients);
    return;
  }
  const allowedDatabases = new Set(request.user.databaseNames ?? []);
  response.json(clients.filter((client) =>
    client.active
    && client.databaseNames.some((database) => allowedDatabases.has(database))
  ));
});

app.post("/api/clients", requireAdmin, async (request, response) => {
  try {
    response.status(201).json(await createClient(request.body));
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
});

app.put("/api/clients/:id", requireAdmin, async (request, response) => {
  try {
    response.json(await updateClient(request.params.id, request.body));
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
});

app.get("/api/health", async (_request, response) => {
  try {
    const pool = await getPool();
    await pool.request().query("select 1 as ok");
    response.json({ ok: true, database: process.env.DB_NAME });
  } catch (error) {
    response.status(error.statusCode ?? 500).json({ ok: false, message: error.message });
  }
});

app.get("/api/databases", async (_request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      select name
      from sys.databases
      where database_id > 4
      order by name
    `);
    const allowed = result.recordset.filter(({ name }) => canAccessDatabase(_request.user, name));
    const databases = await Promise.all(allowed.map(async ({ name }) => {
      const sourceMode = await getSourceMode(name);
      return {
        name,
        sourceMode,
        isEngibras: isEngibrasDatabase(name),
      };
    }));
    response.json(databases);
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/operations", async (request, response) => {
  try {
    const database = await resolveDatabase(request.query.database);
    assertDatabaseAccess(request.user, database);
    const sourceMode = await getSourceMode(database);
    const allowedEntities = new Set(getVisibleMappings(sourceMode).map((mapping) => mapping.entity));
    response.json(msNextiOperations.filter((operation) =>
      allowedEntities.has(operation.entity)
      || allowedEntities.has(operation.entity.replace(" - Protheus", ""))
    ));
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/entities", async (request, response) => {
  try {
    const database = await resolveDatabase(request.query.database);
    assertDatabaseAccess(request.user, database);
    const sourceMode = await getSourceMode(database);
    const mappedEntities = getVisibleMappings(sourceMode).map((mapping) => ({
      entity: mapping.entity,
      source: mapping.source,
      baseEntity: mapping.baseEntity,
    }));
    const operationEntities = sourceMode === "senior"
      ? msNextiOperations
        .filter((operation) => !/protheus|bairro|cidade/i.test(operation.entity))
        .map((operation) => ({
          entity: operation.entity,
          source: "senior",
          baseEntity: operation.entity,
        }))
      : [];

    response.json(uniqueEntities([...mappedEntities, ...operationEntities]));
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/routines", async (request, response) => {
  try {
    const database = await resolveDatabase(request.query.database);
    assertDatabaseAccess(request.user, database);
    const pool = await getPoolForDatabase(database);
    const hasTable = await pool.request().query("select object_id('dbo.configuracao_rotinas') as id");
    if (!hasTable.recordset[0]?.id) {
      response.json([]);
      return;
    }
    const lastRunByProgram = await fetchRoutineCallTimes(pool);

    const result = await pool.request().query(`
      select
        confrot_id,
        confrot_prg,
        confrot_Status,
        confrot_dtp,
        confrot_intexc,
        confrot_dtu,
        confrot_int,
        confrot_con
      from dbo.configuracao_rotinas
      order by confrot_prg
    `);

    response.json(result.recordset
      .filter((routine) => !isEngibrasDatabase(database) || normalizeRoutineKey(routine.confrot_prg) !== "penviacaracteristicapostos")
      .map((routine) => normalizeRoutine(routine, lastRunByProgram, database)));
  } catch (error) {
    sendError(response, error);
  }
});

app.put("/api/routines/:id/status", async (request, response) => {
  try {
    const database = await resolveDatabase(request.body?.database ?? request.query.database);
    assertDatabaseAccess(request.user, database);
    const pool = await getPoolForDatabase(database);
    const active = Boolean(request.body?.active);
    const result = await pool.request()
      .input("id", sql.Int, Number(request.params.id))
      .input("status", sql.NVarChar, active ? "S" : "N")
      .query(`
        update dbo.configuracao_rotinas
        set confrot_Status = @status
        where confrot_id = @id
      `);
    response.json({ ok: true, affectedRows: result.rowsAffected?.[0] ?? 0 });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/stats", async (request, response) => {
  try {
    const database = await resolveDatabase(request.query.database);
    assertDatabaseAccess(request.user, database);
    const sourceMode = await getSourceMode(database);
    const pool = await getPoolForDatabase(database);
    const mappings = await filterExistingMappings(pool, getVisibleMappings(sourceMode));
    const stats = await Promise.all(mappings.map((mapping) => fetchEntityStats(pool, mapping, request.query)));
    const totalReceived = stats.reduce((sum, item) => sum + item.total, 0);
    const success = stats.reduce((sum, item) => sum + item.success, 0);
    const error = stats.reduce((sum, item) => sum + item.error, 0);
    const pending = stats.reduce((sum, item) => sum + item.pending, 0);
    const processed = totalReceived - pending;
    const lastRun = stats
      .map((item) => item.lastRun)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    response.json({
      totalReceived,
      processed,
      success,
      error,
      pending,
      successRate: totalReceived ? success / totalReceived : 0,
      lastRun,
      byEntity: stats.map(({ lastRun: _lastRun, ...item }) => item),
    });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/logs", async (request, response) => {
  try {
    const limitPerEntity = Math.min(Number(request.query.limitPerEntity ?? 50000), 50000);
    const database = await resolveDatabase(request.query.database);
    assertDatabaseAccess(request.user, database);
    const sourceMode = await getSourceMode(database);
    const pool = await getPoolForDatabase(database);
    const mappings = await filterExistingMappings(pool, getVisibleMappings(sourceMode));
    const batches = await Promise.all(
      mappings.map((mapping) => fetchIntegrationRows(pool, mapping, limitPerEntity, database)),
    );
    const logs = batches
      .flat()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    response.json(logs);
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/logs/reprocess", async (request, response) => {
  try {
    const database = await resolveDatabase(request.body?.database);
    assertDatabaseAccess(request.user, database);
    const log = request.body?.log;
    const payload = log?.payload ?? {};
    const sourceTable = cleanValue(payload.sourceTable);
    const sourceColumn = cleanValue(payload.sourceColumn);
    const sourceId = cleanValue(payload.sourceId);
    const mapping = integrationMappings.find((item) =>
      item.table === sourceTable
      && item.sourceColumns.includes(sourceColumn)
      && item.errorColumn
      && item.actionErrorColumn
    );

    if (!mapping || !sourceColumn || !sourceId) {
      response.status(400).json({ message: "Log sem mapeamento seguro para reprocessamento." });
      return;
    }

    const pool = await getPoolForDatabase(database);
    const tableExists = await filterExistingMappings(pool, [mapping]);
    if (!tableExists.length) {
      response.status(400).json({ message: "Tabela do log não encontrada no banco selecionado." });
      return;
    }

    const result = await pool.request()
      .input("sourceId", sql.NVarChar, sourceId)
      .query(`
        update ${mapping.table}
        set [${mapping.errorColumn}] = null,
            [${mapping.actionErrorColumn}] = null
        where convert(nvarchar(max), [${sourceColumn}]) = @sourceId
      `);

    response.json({ ok: true, affectedRows: result.rowsAffected?.[0] ?? 0 });
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/executions", async (_request, response) => {
  try {
    const database = await resolveDatabase(_request.query.database);
    assertDatabaseAccess(_request.user, database);
    const sourceMode = await getSourceMode(database);
    const pool = await getPoolForDatabase(database);
    const mappings = await filterExistingMappings(pool, getVisibleMappings(sourceMode));
    const batches = await Promise.all(
      mappings.map((mapping) => fetchIntegrationRows(pool, mapping, 1000, database)),
    );
    const logs = batches.flat();
    const totalSuccess = logs.filter((log) => log.status === "success").length;
    const totalError = logs.filter((log) => log.status === "error").length;
    const totalPending = logs.filter((log) => log.status === "pending").length;

    response.json([
      {
        id: "db-current-snapshot",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        client: database,
        environment: "Homologação",
        status: totalError > 0 ? "partial" : "success",
        totalProcessed: logs.length,
        totalSuccess,
        totalError,
        totalPending,
      },
    ]);
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/schema/tables", async (_request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      select
        s.name as schemaName,
        t.name as tableName
      from sys.tables t
      inner join sys.schemas s on s.schema_id = t.schema_id
      order by s.name, t.name
    `);
    response.json(result.recordset);
  } catch (error) {
    sendError(response, error);
  }
});

app.get("/api/schema/tables/:schema/:table/columns", async (request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("schema", sql.NVarChar, request.params.schema)
      .input("table", sql.NVarChar, request.params.table)
      .query(`
        select
          c.name as columnName,
          ty.name as dataType,
          c.max_length as maxLength,
          c.is_nullable as isNullable
        from sys.columns c
        inner join sys.types ty on ty.user_type_id = c.user_type_id
        inner join sys.tables t on t.object_id = c.object_id
        inner join sys.schemas s on s.schema_id = t.schema_id
        where s.name = @schema and t.name = @table
        order by c.column_id
      `);
    response.json(result.recordset);
  } catch (error) {
    sendError(response, error);
  }
});

function requireAdmin(request, response, next) {
  if (request.user?.role !== "admin") {
    response.status(403).json({ message: "Acesso permitido somente para Admin Maxsystem." });
    return;
  }
  next();
}

function sendError(response, error, fallback = 500) {
  response.status(error.statusCode ?? fallback).json({ message: error.message });
}

function assertDatabaseAccess(user, database) {
  if (!canAccessDatabase(user, database)) {
    const error = new Error("Usuário sem acesso ao banco selecionado.");
    error.statusCode = 403;
    throw error;
  }
}

app.listen(port, () => {
  console.log(`API do painel IntegraNexti em http://localhost:${port}`);
});
setInterval(() => {}, 1 << 30);

async function fetchIntegrationRows(pool, mapping, limit, database) {
  const actionStatusColumn = await findActionStatusColumn(pool, mapping);
  const mapped = { ...mapping, actionStatusColumn };
  const orderExpression = mapping.dateColumns.length
    ? mapping.dateColumns.length === 1
      ? `[${mapping.dateColumns[0]}] desc`
      : `coalesce(${mapping.dateColumns.map((column) => `[${column}]`).join(", ")}) desc`
    : "1 desc";

  const result = await pool.request()
    .input("limit", sql.Int, limit)
    .query(`select top (@limit) * from ${mapping.table} ${buildValidRecordWhere(mapping, actionStatusColumn)} order by ${orderExpression}`);

  return result.recordset.map((row, index) => normalizeIntegrationRow(mapped, { ...row, __databaseName: database }, index));
}

async function fetchEntityStats(pool, mapping, query) {
  const actionStatusColumn = await findActionStatusColumn(pool, mapping);
  const dateExpression = buildDateExpression(mapping);
  const dateWhere = buildStatsDateWhere(dateExpression, query);
  const actionExpression = actionStatusColumn
    ? `upper(nullif(ltrim(rtrim(convert(nvarchar(max), [${actionStatusColumn}]))), ''))`
    : "null";
  const errorExpression = buildErrorExpression(mapping);
  const successExpression = buildSuccessExpression(mapping, actionExpression, errorExpression);
  const pendingExpression = `not (${errorExpression}) and ${actionExpression} in ('I', 'U') and ${buildActionErrorEmptyExpression(mapping)}`;
  const validWhere = buildValidRecordWhere(mapping, actionStatusColumn);

  const request = pool.request();
  if (dateWhere.from) request.input("dateFrom", sql.DateTime2, dateWhere.from);
  if (dateWhere.to) request.input("dateTo", sql.DateTime2, dateWhere.to);

  const result = await request.query(`
    select
      count(1) as total,
      sum(case when ${errorExpression} then 1 else 0 end) as error,
      sum(case when ${successExpression} then 1 else 0 end) as success,
      sum(case when ${pendingExpression} then 1 else 0 end) as pending,
      max(${dateExpression}) as lastRun
    from ${mapping.table}
    ${mergeWhere(validWhere, dateWhere.sql)}
  `);
  const row = result.recordset[0] ?? {};
  const total = Number(row.total ?? 0);
  const success = Number(row.success ?? 0);
  const error = Number(row.error ?? 0);
  const pending = Number(row.pending ?? 0);

  return {
    entity: mapping.entity,
    total,
    success,
    error,
    pending,
    lastRun: dateToIso(row.lastRun),
  };
}

function buildValidRecordWhere(mapping, actionStatusColumn) {
  const clauses = [];
  const actionExpression = actionStatusColumn
    ? `upper(nullif(ltrim(rtrim(convert(nvarchar(max), [${actionStatusColumn}]))), ''))`
    : "null";
  const errorExpression = buildErrorExpression(mapping);
  const successExpression = buildSuccessExpression(mapping, actionExpression, errorExpression);
  const pendingExpression = `not (${errorExpression}) and ${actionExpression} in ('I', 'U') and ${buildActionErrorEmptyExpression(mapping)}`;
  clauses.push(`(${errorExpression} or ${successExpression} or ${pendingExpression})`);
  if (actionStatusColumn) {
    clauses.push(`coalesce(upper(nullif(ltrim(rtrim(convert(nvarchar(max), [${actionStatusColumn}]))), '')), '') <> 'D'`);
  }
  if (/ListaAusenciaProtheus/i.test(mapping.table)) {
    clauses.push(`not exists (
      select 1
      from dbo.ParametroGeral pg
      where pg.ParTipo = 11
        and [lap_sitafa] is not null
        and concat(',', replace(convert(nvarchar(max), pg.Par001), ' ', ''), ',') like concat('%,', convert(nvarchar(max), [lap_sitafa]), ',%')
    )`);
  }
  return clauses.length ? `where ${clauses.join(" and ")}` : "";
}

function mergeWhere(firstWhere, secondWhere) {
  const clauses = [];
  if (firstWhere) clauses.push(firstWhere.replace(/^where\s+/i, ""));
  if (secondWhere) clauses.push(secondWhere.replace(/^where\s+/i, ""));
  return clauses.length ? `where ${clauses.join(" and ")}` : "";
}

function buildNextiExpression(mapping) {
  if (!mapping.nextiColumn) return "0";
  return `try_convert(bigint, nullif(ltrim(rtrim(convert(nvarchar(max), [${mapping.nextiColumn}]))), ''))`;
}

function buildSuccessExpression(mapping, actionExpression, errorExpression) {
  const nextiCheck = mapping.requiresNextiId === false ? "1 = 1" : `${buildNextiExpression(mapping)} > 0`;
  return `not (${errorExpression}) and ${actionExpression} = 'X' and ${nextiCheck}`;
}

function buildActionErrorEmptyExpression(mapping) {
  if (!mapping.actionErrorColumn) return "1 = 1";
  return `nullif(ltrim(rtrim(convert(nvarchar(max), [${mapping.actionErrorColumn}]))), '') is null`;
}

function buildDateExpression(mapping) {
  const dataAcaoPendColumns = mapping.dateColumns.filter((column) => /dataacaopend/i.test(column));
  const columns = dataAcaoPendColumns.length ? dataAcaoPendColumns : mapping.dateColumns;
  if (!columns.length) return "cast(null as datetime2)";
  if (columns.length === 1) return `[${columns[0]}]`;
  return `coalesce(${columns.map((column) => `[${column}]`).join(", ")})`;
}

function buildErrorExpression(mapping) {
  const checks = [];
  if (mapping.errorColumn) {
    checks.push(`nullif(ltrim(rtrim(convert(nvarchar(max), [${mapping.errorColumn}]))), '') is not null`);
  }
  if (mapping.actionErrorColumn) {
    checks.push(`coalesce(upper(nullif(ltrim(rtrim(convert(nvarchar(max), [${mapping.actionErrorColumn}]))), '')), '') = 'E'`);
  }
  return checks.length ? checks.join(" or ") : "1 = 0";
}

function buildStatsDateWhere(dateExpression, query) {
  const period = cleanValue(query.period);
  let from = null;
  let to = null;

  if (period === "24h") {
    from = new Date(Date.now() - 24 * 60 * 60 * 1000);
  } else if (period === "7d") {
    from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === "custom") {
    if (query.dateFrom) from = new Date(`${query.dateFrom}T00:00:00`);
    if (query.dateTo) to = new Date(`${query.dateTo}T23:59:59`);
  }

  const clauses = [];
  if (from && !Number.isNaN(from.getTime())) clauses.push(`${dateExpression} >= @dateFrom`);
  if (to && !Number.isNaN(to.getTime())) clauses.push(`${dateExpression} <= @dateTo`);

  return {
    from: from && !Number.isNaN(from.getTime()) ? from : null,
    to: to && !Number.isNaN(to.getTime()) ? to : null,
    sql: clauses.length ? `where ${clauses.join(" and ")}` : "",
  };
}

async function findActionStatusColumn(pool, mapping) {
  const [schema, table] = mapping.table.replaceAll("[", "").replaceAll("]", "").split(".");
  const preferred = mapping.errorColumn?.replace(/_Erro$/i, "_AcaoPendencia");
  const result = await pool.request()
    .input("schema", sql.NVarChar, schema)
    .input("table", sql.NVarChar, table)
    .query(`
      select c.name as columnName
      from sys.columns c
      inner join sys.tables t on t.object_id = c.object_id
      inner join sys.schemas s on s.schema_id = t.schema_id
      where s.name = @schema
        and t.name = @table
        and c.name like '%AcaoPendencia%'
      order by c.column_id
    `);
  const columns = result.recordset.map((row) => row.columnName);
  return columns.find((column) => preferred && column.toLowerCase() === preferred.toLowerCase())
    ?? columns.find((column) => !/c$/i.test(column))
    ?? columns[0]
    ?? mapping.actionErrorColumn
    ?? null;
}

function normalizeIntegrationRow(mapping, row, index) {
  const errorMessage = formatReturnMessage(row[mapping.errorColumn]);
  const nextiId = cleanValue(row[mapping.nextiColumn]);
  const actionError = cleanValue(row[mapping.actionErrorColumn]);
  const actionStatus = cleanValue(row[mapping.actionStatusColumn]);
  const statusText = cleanValue(row[mapping.statusColumn]);
  const sourceKey = getFirstValue(row, mapping.sourceColumns);
  const sourceId = sourceKey?.value ?? `${mapping.table}-${index + 1}`;
  const date = getFirstDate(row, mapping.dateColumns) ?? "1970-01-01T00:00:00.000Z";
  const normalizedActionStatus = actionStatus?.toUpperCase();
  const normalizedActionError = actionError?.toUpperCase();
  const hasError = normalizedActionError === "E" || Boolean(errorMessage);
  const hasNextiId = Boolean(nextiId) && nextiId !== "0";
  const nextiOk = mapping.requiresNextiId === false || hasNextiId;
  const status = hasError
    ? "error"
    : normalizedActionStatus === "X" && nextiOk
      ? "success"
      : ["I", "U"].includes(normalizedActionStatus ?? "") && !actionError
        ? "pending"
        : "pending";
  const message = errorMessage
    || (hasError ? "Registro marcado com erro no banco intermediário." : null)
    || statusText
    || (status === "success" ? "Registro concluído com ID Nexti preenchido." : "Registro pendente sem erro registrado.");

  return {
    id: `${mapping.table}-${sourceId}-${index}`.replace(/\s+/g, "-"),
    date,
    client: row.__databaseName ?? "Banco selecionado",
    environment: "Homologação",
    entity: mapping.entity,
    operation: "SYNC",
    sourceId,
    nextiId,
    status,
    httpCode: null,
    message,
    attempts: [
      {
        at: date,
        status,
        httpCode: null,
        message,
      },
    ],
    payload: {
      sourceTable: mapping.table,
      sourceColumn: sourceKey?.column ?? null,
      sourceId,
      errorColumn: mapping.errorColumn,
      actionErrorColumn: mapping.actionErrorColumn,
      actionStatusColumn: mapping.actionStatusColumn,
      actionError,
      actionStatus,
      status: statusText,
    },
    response: {
      nextiId: hasNextiId ? nextiId : null,
      error: errorMessage,
    },
  };
}

function getFirstValue(row, columns) {
  for (const column of columns) {
    const value = cleanValue(row[column]);
    if (value) return { column, value };
  }
  return null;
}

function getFirstDate(row, columns) {
  for (const column of columns) {
    const value = row[column];
    if (value instanceof Date) return value.toISOString();
    if (value) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime()) && date.getFullYear() > 1900) return date.toISOString();
    }
  }
  return null;
}

function cleanValue(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function formatReturnMessage(value) {
  const normalized = cleanValue(value);
  if (!normalized) return null;

  const commentsIndex = normalized.indexOf('"comments"');
  if (commentsIndex < 0) return normalized;

  const jsonStart = normalized.indexOf("{");
  const jsonEnd = normalized.lastIndexOf("}");
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(normalized.slice(jsonStart, jsonEnd + 1));
      if (Array.isArray(parsed.comments)) {
        return `${parsed.id ?? "Retorno"} - comments: ${parsed.comments.join(" | ")}`;
      }
    } catch {
      // Keep the fallback below for non-standard stored messages.
    }
  }

  const idMatch = normalized.match(/"id"\s*:\s*([^,}\s]+)/);
  const idPrefix = idMatch ? `${idMatch[1]} - ` : "";
  return `${idPrefix}{${normalized.slice(commentsIndex)}}`;
}

function friendlyRoutineName(program) {
  const normalized = cleanValue(program) ?? "Rotina";
  const labels = {
    pcaracteristicapostos: "Características de postos",
    pcargos: "Cargos",
    pclientetomador: "Clientes e tomadores",
    pcolaborador: "Colaboradores",
    pconsultacomplementar: "Consulta complementar",
    pconsultadependentes: "Consulta de dependentes",
    pempresa: "Empresas",
    penviacargos: "Envio de cargos",
    penviaempresa: "Envio de empresas",
    penviaclientes: "Envio de clientes",
    penviasindicato: "Envio de sindicatos",
    penviasituacoes: "Envio de situações",
    penvialistaausencia: "Envio de ausências",
    penviatrocasindicato: "Envio de troca de sindicato",
    penviacolaborador: "Envio de colaboradores",
    penviaconsultacomplementar: "Consulta complementar",
    penviaunidadenegocio: "Envio de unidade de negócio",
    penviaconsultadependentes: "Consulta de dependentes",
    penviahorario: "Envio de horários",
    penviamarcadoreshorarios: "Envio de marcações de horários",
    penviapostotrabalho: "Envio de posto de trabalho",
    penviacaracteristicapostos: "Envio de características de postos",
    penviaescala: "Envio de escalas",
    penviahorarioescalas: "Envio de horários de escalas",
    penviatrocaposto: "Envio de troca de posto",
    penviatrocaescala: "Envio de troca de escala",
    pescalas: "Escalas",
    phorarioescalas: "Horários de escalas",
    phorarios: "Horários",
    plancamentoausencias: "Ausências",
    pmarcadoreshorarios: "Marcações de horários",
    ppostostrabalho: "Postos de trabalho",
    psindicato: "Sindicatos",
    psituacoes: "Situações",
    ptomadorempfilial: "Tomador empresa/filial",
    ptomadorfilial: "Tomador filial",
    ptrocapostonexti: "Troca de posto Nexti",
    ptrocapostosenior: "Troca de posto Senior",
    ptrocasindicato: "Troca de sindicato",
    pturmas: "Turmas",
    punidadenegocio: "Unidade de negócio",
  };
  return labels[normalized.toLowerCase()] ?? normalized.replace(/^p?envia/i, "Envio de ");
}

function normalizeRoutine(routine, lastRunByProgram, database) {
  const program = cleanValue(routine.confrot_prg);
  const lastRunAt = dateToIso(routine.confrot_dtu) ?? lastRunByProgram.get(normalizeRoutineKey(routine.confrot_prg)) ?? null;
  const intervalMinutes = Number(routine.confrot_intexc ?? 0);
  const nextRunAt = lastRunAt && intervalMinutes
    ? addMinutesToSqlIso(lastRunAt, intervalMinutes)
    : null;
  const delayMinutes = nextRunAt ? Math.max((Date.now() - parseLocalIso(nextRunAt).getTime()) / 60000, 0) : 0;
  const statusValue = cleanValue(routine.confrot_Status);
  const active = statusValue === "1" || statusValue?.toUpperCase() === "S" || statusValue?.toLowerCase() === "true";
  return {
    id: routine.confrot_id,
    name: friendlyRoutineName(routine.confrot_prg),
    program,
    active,
    intervalMinutes,
    lastRunAt,
    nextRunAt,
    delayMinutes,
    health: !active ? "inactive" : delayMinutes >= 10 ? "warning" : "ok",
    group: inferRoutineGroup(routine, database),
    integration: cleanValue(routine.confrot_int),
    source: cleanValue(routine.confrot_con),
  };
}

function inferRoutineGroup(routine, database) {
  if (isEngibrasDatabase(database)) return "Geral";
  const text = `${cleanValue(routine.confrot_prg) ?? ""} ${cleanValue(routine.confrot_con) ?? ""} ${cleanValue(routine.confrot_int) ?? ""}`.toLowerCase();
  // Alguns bancos não possuem campo explícito de tipo; a classificação é inferida pelo código/nome da rotina.
  if (/senior|colab_|unineg|trocapostosenior/.test(text)) return "Senior";
  return "Nexti";
}

async function fetchRoutineCallTimes(pool) {
  const hasExecBackground = await pool.request().query("select object_id('dbo.ExecBackground') as id");
  if (!hasExecBackground.recordset[0]?.id) return new Map();

  const result = await pool.request().query(`
    select
      ExecTipo,
      max(coalesce(ExecFim, ExecIni)) as lastRunAt
    from dbo.ExecBackground
    where ExecTipo is not null
    group by ExecTipo
  `);

  return new Map(result.recordset
    .map((row) => [normalizeRoutineKey(row.ExecTipo), dateToIso(row.lastRunAt)])
    .filter(([, value]) => value));
}

function normalizeRoutineKey(value) {
  return cleanValue(value)?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}

function dateToIso(value) {
  if (!(value instanceof Date) || value.getUTCFullYear() <= 1900) return null;
  return [
    value.getUTCFullYear(),
    "-",
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    "-",
    String(value.getUTCDate()).padStart(2, "0"),
    "T",
    String(value.getUTCHours()).padStart(2, "0"),
    ":",
    String(value.getUTCMinutes()).padStart(2, "0"),
    ":",
    String(value.getUTCSeconds()).padStart(2, "0"),
  ].join("");
}

function parseLocalIso(value) {
  return new Date(value);
}

function addMinutesToSqlIso(value, minutes) {
  const next = parseLocalIso(value);
  next.setMinutes(next.getMinutes() + minutes);
  return [
    next.getFullYear(),
    "-",
    String(next.getMonth() + 1).padStart(2, "0"),
    "-",
    String(next.getDate()).padStart(2, "0"),
    "T",
    String(next.getHours()).padStart(2, "0"),
    ":",
    String(next.getMinutes()).padStart(2, "0"),
    ":",
    String(next.getSeconds()).padStart(2, "0"),
  ].join("");
}

async function resolveDatabase(database) {
  const requested = cleanValue(database) ?? process.env.DB_NAME;
  const pool = await getPool();
  const result = await pool.request()
    .input("database", sql.NVarChar, requested)
    .query("select name from sys.databases where name = @database and database_id > 4");

  if (!result.recordset.length) {
    throw new Error("Banco de dados inválido ou indisponível.");
  }

  return requested;
}

async function getSourceMode(database) {
  try {
    const pool = await getPoolForDatabase(database);
    const hasParametro = await pool.request().query("select object_id('dbo.ParametroGeral') as id");
    if (!hasParametro.recordset[0]?.id) return isEngibrasDatabase(database) ? "protheus" : "senior";

    const result = await pool.request().query(`
      select top 1 Par001
      from dbo.ParametroGeral
      where ParTipo = 20
    `);
    return cleanValue(result.recordset[0]?.Par001) === "1" ? "protheus" : "senior";
  } catch {
    return isEngibrasDatabase(database) ? "protheus" : "senior";
  }
}

function isEngibrasDatabase(database) {
  return /engibras/i.test(database);
}

function getVisibleMappings(sourceMode) {
  const byBaseEntity = new Map();
  for (const mapping of integrationMappings) {
    if (mapping.entity === "Bairros" || mapping.entity === "Cidades") continue;
    if (sourceMode === "senior" && /protheus/i.test(mapping.entity)) continue;
    const current = byBaseEntity.get(mapping.baseEntity) ?? [];
    current.push(mapping);
    byBaseEntity.set(mapping.baseEntity, current);
  }

  return [...byBaseEntity.values()].flatMap((mappings) => {
    if (sourceMode === "senior") return mappings;

    if (mappings.length === 1) {
      const [mapping] = mappings;
      return mapping.source === "neutral" || mapping.source === sourceMode ? [mapping] : [];
    }

    const preferred = mappings.find((mapping) => mapping.source === sourceMode);
    if (preferred) return [preferred];
    return mappings.filter((mapping) => mapping.source === "neutral");
  });
}

function uniqueEntities(entities) {
  const seen = new Set();
  return entities.filter((entity) => {
    const key = entity.entity.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.entity.localeCompare(b.entity, "pt-BR"));
}

async function filterExistingMappings(pool, mappings) {
  const checked = await Promise.all(mappings.map(async (mapping) => {
    const [schema, table] = mapping.table.replaceAll("[", "").replaceAll("]", "").split(".");
    const result = await pool.request()
      .input("schema", sql.NVarChar, schema)
      .input("table", sql.NVarChar, table)
      .query(`
        select object_id(quotename(@schema) + '.' + quotename(@table)) as objectId
      `);
    return result.recordset[0]?.objectId ? mapping : null;
  }));
  return checked.filter(Boolean);
}
