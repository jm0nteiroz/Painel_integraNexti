import { Badge } from "./Badge";
import type { Execution, ExecutionStatus } from "../types";
import { formatDateTime, formatNumber } from "../utils/format";

const labels: Record<ExecutionStatus, string> = {
  success: "Sucesso",
  error: "Erro",
  running: "Em execução",
  partial: "Parcial",
};

export function ExecutionsTable({ executions }: { executions: Execution[] }) {
  return (
    <section className="data-table-card overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-ink">Execuções</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              {["Início", "Fim", "Status", "Processado", "Sucesso", "Erro", "Processando"].map((column) => (
                <th key={column} className="px-5 py-4 font-semibold">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {executions.map((execution) => (
              <tr key={execution.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 text-muted">{formatDateTime(execution.startedAt)}</td>
                <td className="px-5 py-4 text-muted">{formatDateTime(execution.finishedAt)}</td>
                <td className="px-5 py-4"><Badge status={execution.status}>{labels[execution.status]}</Badge></td>
                <td className="px-5 py-4 text-muted">{formatNumber(execution.totalProcessed)}</td>
                <td className="px-5 py-4 text-emerald-400">{formatNumber(execution.totalSuccess)}</td>
                <td className="px-5 py-4 text-rose-400">{formatNumber(execution.totalError)}</td>
                <td className="px-5 py-4 text-amber-400">{formatNumber(execution.totalPending)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
