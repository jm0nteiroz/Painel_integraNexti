import { mockExecutions } from "../data/mockExecutions";
import { mockLogs } from "../data/mockLogs";
import { msNextiOperations } from "../data/msNextiOperations";
import type { DashboardStats, DatabaseInfo, Execution, IntegrationEntityInfo, IntegrationLog, IntegrationOperationSpec, LogFilters, RoutineInfo } from "../types";

export type LogRepository = {
  listDatabases: () => Promise<DatabaseInfo[]>;
  listLogs: (database?: string) => Promise<IntegrationLog[]>;
  listExecutions: (database?: string) => Promise<Execution[]>;
  listOperations: (database?: string) => Promise<IntegrationOperationSpec[]>;
  listEntities: (database?: string) => Promise<IntegrationEntityInfo[]>;
  listRoutines: (database?: string) => Promise<RoutineInfo[]>;
  listStats: (database?: string, filters?: LogFilters) => Promise<DashboardStats>;
  reprocessLog: (database: string, log: IntegrationLog) => Promise<void>;
  updateNextiId: (database: string, log: IntegrationLog, nextiId: string) => Promise<void>;
  updateRoutineStatus: (database: string, routineId: number, active: boolean) => Promise<void>;
};

export const mockLogRepository: LogRepository = {
  async listDatabases() {
    return [{ name: "Mock local", sourceMode: "protheus", isEngibras: true }];
  },
  async listLogs() {
    return mockLogs;
  },
  async listExecutions() {
    return mockExecutions;
  },
  async listOperations() {
    return msNextiOperations;
  },
  async listEntities() {
    return msNextiOperations.map((operation) => ({ entity: operation.entity, source: "neutral", baseEntity: operation.entity }));
  },
  async listRoutines() {
    return [];
  },
  async listStats() {
    const totalReceived = mockLogs.length;
    const success = mockLogs.filter((log) => log.status === "success" || log.status === "analyzed").length;
    const error = mockLogs.filter((log) => log.status === "error").length;
    const pending = mockLogs.filter((log) => log.status === "pending" || log.status === "reprocess").length;
    const processed = totalReceived - pending;
    return {
      totalReceived,
      processed,
      success,
      error,
      pending,
      successRate: processed ? success / processed : 0,
      lastRun: mockLogs[0]?.date ?? null,
      byEntity: [],
    };
  },
  async reprocessLog() {
    return undefined;
  },
  async updateNextiId() {
    return undefined;
  },
  async updateRoutineStatus() {
    return undefined;
  },
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
let authToken = sessionStorage.getItem("integranexti_token") ?? "";

export function setAuthToken(token: string) {
  authToken = token;
  if (token) sessionStorage.setItem("integranexti_token", token);
  else sessionStorage.removeItem("integranexti_token");
}

export function getAuthToken() {
  return authToken;
}

async function fetchJson<T>(path: string, database?: string): Promise<T> {
  const url = new URL(path, apiBaseUrl || window.location.origin);
  if (database) url.searchParams.set("database", database);
  const response = await fetch(url.toString(), { headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined });
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path}`);
  }
  return response.json();
}

async function fetchStats(path: string, database?: string, filters?: LogFilters): Promise<DashboardStats> {
  const url = new URL(path, apiBaseUrl || window.location.origin);
  if (database) url.searchParams.set("database", database);
  if (filters?.period) url.searchParams.set("period", filters.period);
  if (filters?.dateFrom) url.searchParams.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) url.searchParams.set("dateTo", filters.dateTo);
  const response = await fetch(url.toString(), { headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined });
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path}`);
  }
  return response.json();
}

export const apiLogRepository: LogRepository = {
  listDatabases() {
    return fetchJson<DatabaseInfo[]>("/api/databases");
  },
  listLogs(database) {
    return fetchJson<IntegrationLog[]>("/api/logs", database);
  },
  listExecutions(database) {
    return fetchJson<Execution[]>("/api/executions", database);
  },
  listOperations(database) {
    return fetchJson<IntegrationOperationSpec[]>("/api/operations", database);
  },
  listEntities(database) {
    return fetchJson<IntegrationEntityInfo[]>("/api/entities", database);
  },
  listRoutines(database) {
    return fetchJson<RoutineInfo[]>("/api/routines", database);
  },
  listStats(database, filters) {
    return fetchStats("/api/stats", database, filters);
  },
  async reprocessLog(database, log) {
    const response = await fetch(`${apiBaseUrl || ""}/api/logs/reprocess`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: JSON.stringify({ database, log }),
    });
    if (!response.ok) {
      throw new Error("Falha ao solicitar reprocessamento.");
    }
  },
  async updateNextiId(database, log, nextiId) {
    const response = await fetch(`${apiBaseUrl || ""}/api/logs/nexti-id`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: JSON.stringify({ database, log, nextiId }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message ?? "Falha ao atualizar ID Nexti.");
    }
  },
  async updateRoutineStatus(database, routineId, active) {
    const response = await fetch(`${apiBaseUrl || ""}/api/routines/${routineId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: JSON.stringify({ database, active }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message ?? "Falha ao atualizar rotina.");
    }
  },
};

export const activeLogRepository =
  import.meta.env.VITE_USE_MOCKS === "true" ? mockLogRepository : apiLogRepository;

// Future implementation example:
// export const apiLogRepository: LogRepository = {
//   async listLogs() {
//     const response = await fetch("/api/integranexti/logs");
//     if (!response.ok) throw new Error("Falha ao buscar logs");
//     return response.json();
//   },
//   async listExecutions() {
//     const response = await fetch("/api/integranexti/executions");
//     if (!response.ok) throw new Error("Falha ao buscar execucoes");
//     return response.json();
//   },
// };
