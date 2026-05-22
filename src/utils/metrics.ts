import type { IntegrationLog, LogFilters, LogStatus } from "../types";

const periodToDays: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

export const filterLogs = (logs: IntegrationLog[], filters: LogFilters) => {
  const now = Date.now();

  return logs.filter((log) => {
    const logTime = new Date(log.date).getTime();
    const message = log.message.toLowerCase();

    if (filters.entity && log.entity !== filters.entity) return false;
    if (filters.status && log.status !== filters.status) return false;
    if (filters.message && !message.includes(filters.message.toLowerCase())) return false;
    if (filters.period && filters.period !== "custom") {
      const days = periodToDays[filters.period];
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      if (logTime < cutoff) return false;
    }
    if (filters.period === "custom") {
      if (filters.dateFrom) {
        const from = new Date(`${filters.dateFrom}T00:00:00`).getTime();
        if (logTime < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(`${filters.dateTo}T23:59:59`).getTime();
        if (logTime > to) return false;
      }
    }

    return true;
  });
};

export const buildSummary = (logs: IntegrationLog[]) => {
  const totalReceived = logs.length;
  const success = logs.filter((log) => log.status === "success").length;
  const error = logs.filter((log) => log.status === "error").length;
  const pending = logs.filter((log) => log.status === "pending").length;
  const processed = totalReceived - pending;
  const lastRun = logs.reduce((latest, log) => (log.date > latest ? log.date : latest), logs[0]?.date ?? "");

  return {
    totalReceived,
    processed,
    success,
    error,
    pending,
    successRate: totalReceived ? success / totalReceived : 0,
    lastRun,
    byEntity: buildEntityStats(logs),
  };
};

export const buildEntityStats = (logs: IntegrationLog[]) => {
  const rows = new Map<string, { entity: string; total: number; success: number; error: number; pending: number }>();
  for (const log of logs) {
    const current = rows.get(log.entity) ?? { entity: log.entity, total: 0, success: 0, error: 0, pending: 0 };
    current.total += 1;
    if (log.status === "success") current.success += 1;
    if (log.status === "error") current.error += 1;
    if (log.status === "pending") current.pending += 1;
    rows.set(log.entity, current);
  }
  return [...rows.values()].sort((a, b) => a.entity.localeCompare(b.entity, "pt-BR"));
};

export const groupBy = <T,>(items: T[], getKey: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

export const statusLabel: Record<LogStatus, string> = {
  success: "Concluído",
  error: "Erro",
  pending: "Pendente",
  ignored: "Ignorado",
  analyzed: "Analisado",
  reprocess: "Reprocessamento",
};
