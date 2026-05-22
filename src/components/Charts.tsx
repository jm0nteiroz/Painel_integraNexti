type BarDatum = {
  label: string;
  value: number;
  color?: string;
};

type StackedDatum = {
  label: string;
  success: number;
  error: number;
};

export function BarChart({ title, data }: { title: string; data: BarDatum[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <section className="rounded-lg border border-sky-100 bg-white/95 p-4 shadow-sm backdrop-blur">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">{title}</h2>
      {data.length === 0 ? (
        <p className="mt-5 text-sm text-muted">Sem registros no período selecionado.</p>
      ) : null}
      <div className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
        {data.map((item) => (
          <div key={item.label} className="grid grid-cols-[136px_1fr_28px] items-center gap-2 text-xs">
            <span className="leading-tight text-muted">{item.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${item.color ?? "bg-brand"}`}
                style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 5 : 0)}%` }}
              />
            </div>
            <span className="text-right font-semibold text-ink">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StackedDailyChart({ data }: { data: StackedDatum[] }) {
  const max = Math.max(...data.map((item) => item.success + item.error), 1);

  return (
    <section className="rounded-lg border border-sky-100 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-ink">Sucessos x erros por dia</h2>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-emerald-500" />Sucesso</span>
          <span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-rose-500" />Erro</span>
        </div>
      </div>
      <div className="mt-5 flex h-52 items-end gap-3">
        {data.map((item) => {
          const height = Math.max(((item.success + item.error) / max) * 100, 8);
          const successHeight = item.success + item.error ? (item.success / (item.success + item.error)) * 100 : 0;
          return (
            <div key={item.label} className="flex min-w-10 flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end">
                <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-md bg-slate-100" style={{ height: `${height}%` }}>
                  <div className="bg-emerald-500" style={{ height: `${successHeight}%` }} />
                  <div className="bg-rose-500" style={{ height: `${100 - successHeight}%` }} />
                </div>
              </div>
              <span className="text-xs text-muted">{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
