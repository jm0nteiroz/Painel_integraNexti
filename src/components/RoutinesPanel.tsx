import { AlertTriangle, RefreshCcw } from "lucide-react";
import type { RoutineInfo, UserRole } from "../types";
import { formatCompactDateTime } from "../utils/format";
import { Button } from "./ui/button";

export function RoutinesPanel({ routines, userRole, onRefresh, onToggle }: { routines: RoutineInfo[]; userRole?: UserRole; onRefresh?: () => void; onToggle?: (routine: RoutineInfo) => void }) {
  const visibleRoutines = routines;
  const activeCount = visibleRoutines.filter((routine) => routine.active).length;
  const groups = [...new Set(visibleRoutines.map((routine) => routine.group))];

  return (
    <section className="rounded-lg border border-sky-100 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Informações de Serviço</h2>
          <p className="mt-1 text-xs text-muted">
            {userRole === "client"
              ? `${activeCount} ativas de ${visibleRoutines.length} rotinas`
              : `${activeCount} ativas de ${routines.length} rotinas`}
          </p>
        </div>
        {onRefresh ? <Button type="button" variant="outline" size="sm" onClick={onRefresh}><RefreshCcw size={14} /> Atualizar busca</Button> : null}
      </div>

      <div className="mt-4 space-y-5">
        {!visibleRoutines.length ? (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-ink">
            Nenhuma rotina encontrada.
          </div>
        ) : null}
        {groups.map((group) => (
          <section key={group}>
            {groups.length > 1 ? <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand">{group}</h3> : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleRoutines.filter((routine) => routine.group === group).map((routine) => (
                <article key={routine.id} className={`relative rounded-lg border p-3 ${cardStyle(routine)}`}>
                  <span className={`absolute left-4 top-4 size-3 rounded-full ring-2 ring-white/20 ${statusDot(routine)}`} title={routine.active ? "Ativa" : "Inativa"} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3 pl-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{routine.name}</p>
                        <p className="mt-1 text-xs text-muted">{routine.active ? "Ativa" : "Inativa"} · intervalo {formatInterval(routine.intervalMinutes)}</p>
                        <p className="mt-1 text-xs text-muted">Última execução: {formatCompactDateTime(routine.lastRunAt)}</p>
                        <p className="mt-1 text-xs text-muted">Próxima execução: {formatCompactDateTime(routine.nextRunAt)}</p>
                        {shouldShowDelay(routine, userRole) ? <p className="mt-1 text-xs text-muted">Atraso: {formatDelay(routine.delayMinutes)}</p> : null}
                        {routine.active && routine.delayMinutes >= 10 ? (
                          <div className="routine-delay-alert mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-400/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200">
                            <AlertTriangle size={14} /> Atraso: {formatDelay(routine.delayMinutes)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {onToggle ? <Button type="button" variant="outline" size="sm" onClick={() => onToggle(routine)}>{routine.active ? "Desativar" : "Ativar"}</Button> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function cardStyle(routine: RoutineInfo) {
  if (!routine.active) return "border-slate-700 bg-slate-500/10 opacity-85";
  if (routine.delayMinutes >= 10) return "border-amber-400/50 bg-amber-400/10";
  return "border-emerald-400/35 bg-emerald-400/10";
}

function statusDot(routine: RoutineInfo) {
  if (!routine.active) return "bg-rose-500";
  if (routine.delayMinutes >= 10) return "bg-amber-400";
  return "bg-emerald-400";
}

function shouldShowDelay(routine: RoutineInfo, userRole?: UserRole) {
  if (userRole === "client") return routine.delayMinutes >= 10;
  return routine.delayMinutes > 0;
}

function formatInterval(minutes: number) {
  const totalMinutes = Math.max(Math.floor(minutes ?? 0), 0);
  if (totalMinutes < 60) return `${String(totalMinutes).padStart(2, "0")}min`;
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  return `${hours}h${String(rest).padStart(2, "0")}min`;
}

function formatDelay(minutes: number) {
  const totalMinutes = Math.max(Math.floor(minutes ?? 0), 0);
  if (totalMinutes < 60) return `${String(totalMinutes).padStart(2, "0")}min`;
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  return `${hours}h${String(rest).padStart(2, "0")}min`;
}
