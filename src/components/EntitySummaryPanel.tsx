import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";
import { LogTable } from "./LogTable";
import type { EntityStat, IntegrationLog, LogStatus } from "../types";
import { formatNumber } from "../utils/format";

type EntitySummaryPanelProps = {
  title: string;
  stats: EntityStat[];
  logs: IntegrationLog[];
  mode: "all" | "errors";
  onView: (log: IntegrationLog) => void;
  onStatusChange: (id: string, status: LogStatus) => void;
  showOpenButton?: boolean;
  showEntityFilter?: boolean;
};

export function EntitySummaryPanel({ title, stats, logs, mode, onView, onStatusChange, showOpenButton = true, showEntityFilter = true }: EntitySummaryPanelProps) {
  const [entity, setEntity] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const visibleStats = useMemo(() => {
    return stats
      .filter((item) => (entity ? item.entity === entity : true))
      .filter((item) => (showEmpty ? true : mode === "errors" ? item.error > 0 : item.total > 0))
      .sort((a, b) => (mode === "errors" ? b.error - a.error : b.total - a.total));
  }, [entity, mode, showEmpty, stats]);

  const modalLogs = useMemo(() => {
    return logs
      .filter((log) => (entity ? log.entity === entity : true))
      .filter((log) => (mode === "errors" ? log.status === "error" : true))
      .filter((log) => (mode === "errors" && message ? log.message.toLowerCase().includes(message.toLowerCase()) : true));
  }, [entity, logs, message, mode]);

  const total = visibleStats.reduce((sum, item) => sum + (mode === "errors" ? item.error : item.total), 0);

  return (
    <section className="rounded-lg border border-sky-100 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">{title}</h2>
          <p className="mt-1 text-xs text-muted">{formatNumber(total)} registros exibidos</p>
        </div>
        {showOpenButton ? <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10">
          Ver mais <ChevronRight size={14} />
        </button> : null}
      </div>

      <div className={`mt-4 grid gap-3 ${showEntityFilter ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-1"}`}>
        {showEntityFilter ? (
        <label className="text-xs font-medium text-muted">
          Entidade
          <select value={entity} onChange={(event) => setEntity(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
            <option value="">Todas</option>
            {stats.map((item) => (
              <option key={item.entity} value={item.entity}>{item.entity}</option>
            ))}
          </select>
        </label>
        ) : null}
        <label className="flex items-end gap-2 pb-2 text-xs font-medium text-muted">
          <input type="checkbox" checked={showEmpty} onChange={(event) => setShowEmpty(event.target.checked)} className="size-4 accent-cyan-400" />
          Exibir entidade vazia
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {visibleStats.slice(0, 8).map((item) => (
          <article key={item.entity} className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink">{item.entity.replace(" - Protheus", "")}</span>
              <span className="text-lg font-semibold text-ink">{formatNumber(mode === "errors" ? item.error : item.total)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Concluído {formatNumber(item.success)} · Pendente {formatNumber(item.pending)} · Erro {formatNumber(item.error)}
            </p>
          </article>
        ))}
      </div>

      {open ? createPortal(
        <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-md">
          <section className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-panel">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{title}</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Logs filtrados</h2>
                <p className="mt-1 text-sm text-muted">{formatNumber(modalLogs.length)} registros encontrados</p>
              </div>
              <button type="button" className="grid size-9 place-items-center rounded-md hover:bg-slate-100" onClick={() => setOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </header>
            <div className="space-y-4 overflow-y-auto p-6">
              <div className={`grid gap-3 ${mode === "errors" ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                <label className="text-xs font-medium text-muted">
                  Entidade
                  <select value={entity} onChange={(event) => { setEntity(event.target.value); setPage(1); }} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
                    <option value="">Todas</option>
                    {stats.map((item) => (
                      <option key={item.entity} value={item.entity}>{item.entity}</option>
                    ))}
                  </select>
                </label>
                {mode === "errors" ? (
                  <label className="text-xs font-medium text-muted">
                    Mensagem de erro
                    <input value={message} onChange={(event) => { setMessage(event.target.value); setPage(1); }} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" placeholder="Buscar texto" />
                  </label>
                ) : null}
              </div>
              <LogTable title={title} logs={modalLogs} page={page} pageSize={8} onPageChange={setPage} onView={onView} onStatusChange={onStatusChange} />
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}
