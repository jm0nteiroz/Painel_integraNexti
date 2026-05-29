import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Badge } from "./Badge";
import type { AuthUser, IntegrationLog } from "../types";
import { formatDateTime } from "../utils/format";
import { statusLabel } from "../utils/metrics";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type LogDetailDrawerProps = {
  log: IntegrationLog | null;
  user: AuthUser | null;
  onUpdateNextiId?: (log: IntegrationLog, nextiId: string) => Promise<void>;
  onClose: () => void;
};

export function LogDetailDrawer({ log, user, onUpdateNextiId, onClose }: LogDetailDrawerProps) {
  const [nextiId, setNextiId] = useState("");
  const [message, setMessage] = useState("");
  const canEditNextiId = user?.role === "admin" && log && (!log.nextiId || log.nextiId === "0");

  useEffect(() => {
    setNextiId("");
    setMessage("");
  }, [log?.id]);

  if (!log) return null;

  const submitNextiId = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    const normalized = nextiId.trim();
    if (!/^\d+$/.test(normalized)) {
      setMessage("Informe apenas números para o ID Nexti.");
      return;
    }
    try {
      await onUpdateNextiId?.(log, normalized);
      setMessage("ID Nexti atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar ID Nexti.");
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-sm" role="dialog" aria-modal="true">
      <aside className="ml-auto flex h-full w-full max-w-4xl flex-col border-l border-sky-100 bg-white shadow-panel">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Detalhe do log</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{log.entity} / {log.operation}</h2>
            <p className="mt-1 text-sm text-muted">{formatDateTime(log.date)}</p>
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-md hover:bg-slate-100" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Status"><Badge status={log.status}>{statusLabel[log.status]}</Badge></Info>
            <Info label="Banco">{log.client}</Info>
            <Info label="Operação">{log.operation}</Info>
            <Info label="ID origem">{log.sourceId}</Info>
            <Info label="ID Nexti">
              <div className="space-y-2">
                <span>{log.nextiId ?? "-"}</span>
                {canEditNextiId ? (
                  <form onSubmit={submitNextiId} className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      value={nextiId}
                      onChange={(event) => setNextiId(event.target.value)}
                      placeholder="Inserir ID"
                      className="h-8 text-xs"
                    />
                    <Button type="submit" size="sm" className="h-8 px-2">
                      <Save size={13} />
                    </Button>
                  </form>
                ) : null}
                {message ? <p className="text-xs text-muted">{message}</p> : null}
              </div>
            </Info>
            <Info label="Tentativas">{log.attempts.length}</Info>
          </div>

          <section className="mt-4 rounded-lg border border-sky-100 bg-sky-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mensagem de retorno</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-ink">{log.message}</p>
          </section>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <CodeBlock title="Payload enviado" value={log.payload} />
            <CodeBlock title="Resposta da API" value={log.response} />
          </div>

          <section className="mt-6 rounded-lg border border-sky-100">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">Histórico de tentativas</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {log.attempts.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">Nenhuma tentativa registrada.</p>
              ) : (
                log.attempts.map((attempt, index) => (
                  <div key={`${attempt.at}-${index}`} className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[160px_110px_1fr]">
                    <span className="text-muted">{formatDateTime(attempt.at)}</span>
                    <Badge status={attempt.status}>{statusLabel[attempt.status]}</Badge>
                    <span className="whitespace-pre-wrap break-words text-ink">{attempt.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-sky-100 bg-white/80 p-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-1 text-sm font-medium text-ink">{children}</div>
    </div>
  );
}

function CodeBlock({ title, value }: { title: string; value: Record<string, unknown> }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-950 text-slate-100">
      <h3 className="border-b border-white/10 px-4 py-3 text-sm font-semibold">{title}</h3>
      <pre className="max-h-80 overflow-auto p-4 text-xs leading-relaxed">{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}
