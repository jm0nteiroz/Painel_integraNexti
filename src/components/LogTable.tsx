import { Eye, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./Badge";
import type { IntegrationLog, LogStatus } from "../types";
import { formatDateTime } from "../utils/format";
import { statusLabel } from "../utils/metrics";

type LogTableProps = {
  logs: IntegrationLog[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onView: (log: IntegrationLog) => void;
  onStatusChange: (id: string, status: LogStatus) => void;
  title?: string;
  actionMode?: "full" | "reprocess";
};

export function LogTable({ logs, page, pageSize, onPageChange, onView, onStatusChange, title = "Logs da Integração" }: LogTableProps) {
  const pages = Math.max(Math.ceil(logs.length / pageSize), 1);
  const current = logs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="data-table-card overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="text-sm text-muted">{logs.length} registros encontrados</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <button className="rounded-lg border border-slate-300 px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
            Anterior
          </button>
          <span className="font-semibold text-ink">Página {page} de {pages}</span>
          <button className="rounded-lg border border-slate-300 px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40" disabled={page === pages} onClick={() => onPageChange(page + 1)}>
            Próxima
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[1040px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              {["Data recebimento", "Entidade/Tabela", "External ID", "ID origem", "ID Nexti", "Ação pendência", "Erro", "Status tratado", "Ações"].map((column) => (
                <th key={column} className="px-5 py-4 font-semibold">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {current.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 text-muted">{formatDateTime(log.date)}</td>
                <td className="px-5 py-4 text-muted">{log.entity}</td>
                <td className="px-5 py-4 font-mono text-xs text-muted">{String(log.payload.externalId ?? "-")}</td>
                <td className="px-5 py-4 font-mono text-xs text-muted">{log.sourceId}</td>
                <td className="px-5 py-4 font-mono text-xs text-muted">{log.nextiId ?? "-"}</td>
                <td className="px-5 py-4 font-mono text-xs text-muted">{String(log.payload.actionStatus ?? "-")}</td>
                <td className="max-w-64 truncate px-5 py-4 text-muted">{String(log.response.error ?? log.payload.actionError ?? "-")}</td>
                <td className="px-5 py-4"><Badge status={log.status}>{statusLabel[log.status]}</Badge></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <IconButton label="Ver detalhes" onClick={() => onView(log)}><Eye size={16} /></IconButton>
                    {log.status === "error" || log.status === "pending" ? (
                      <IconButton
                        label="Solicitar reprocessamento"
                        onClick={() => {
                          if (window.confirm("Confirma solicitar reprocessamento deste registro?")) {
                            onStatusChange(log.id, "reprocess");
                          }
                        }}
                      >
                        <RefreshCcw size={16} />
                      </IconButton>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-brand"
    >
      {children}
    </button>
  );
}
