export type LogStatus = "success" | "error" | "pending" | "ignored" | "analyzed" | "reprocess";
export type ExecutionStatus = "success" | "error" | "running" | "partial";
export type Environment = "Produção" | "Homologação";
export type EntityType = string;

export type IntegrationOperationSpec = {
  method: "POST" | "GET" | "PUT" | "PATCH" | "DELETE";
  path: string;
  operationId: string;
  entity: EntityType;
  requestSchema: string;
};

export type DatabaseInfo = {
  name: string;
  sourceMode: "protheus" | "senior";
  isEngibras: boolean;
};

export type UserRole = "admin" | "client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  databaseNames: string[];
  routinePrograms: string[];
  createdAt: string;
  updatedAt: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  databaseNames: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationEntityInfo = {
  entity: string;
  source: "protheus" | "senior" | "neutral";
  baseEntity: string;
};

export type RoutineInfo = {
  id: number;
  name: string;
  program: string;
  active: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  delayMinutes: number;
  health: "ok" | "warning" | "critical" | "inactive";
  group: "Nexti" | "Senior" | "Geral";
  integration: string | null;
  source: string | null;
};

export type EntityStat = {
  entity: string;
  total: number;
  success: number;
  error: number;
  pending: number;
};

export type DashboardStats = {
  totalReceived: number;
  processed: number;
  success: number;
  error: number;
  pending: number;
  successRate: number;
  lastRun: string | null;
  byEntity: EntityStat[];
};

export type LogAttempt = {
  at: string;
  status: LogStatus;
  httpCode: number | null;
  message: string;
};

export type IntegrationLog = {
  id: string;
  date: string;
  client: string;
  environment: Environment;
  entity: EntityType;
  operation: string;
  sourceId: string;
  nextiId: string | null;
  status: LogStatus;
  httpCode: number | null;
  message: string;
  attempts: LogAttempt[];
  payload: Record<string, unknown>;
  response: Record<string, unknown>;
};

export type Execution = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  client: string;
  environment: Environment;
  status: ExecutionStatus;
  totalProcessed: number;
  totalSuccess: number;
  totalError: number;
  totalPending: number;
};

export type LogFilters = {
  period: string;
  dateFrom: string;
  dateTo: string;
  entity: string;
  status: string;
  message: string;
};
