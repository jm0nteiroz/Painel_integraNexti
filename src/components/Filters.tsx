import type { LogFilters } from "../types";

type FiltersProps = {
  filters: LogFilters;
  entities: string[];
  statuses: string[];
  statusLabels: Partial<Record<string, string>>;
  onChange: (filters: LogFilters) => void;
};

export function Filters({ filters, entities, statuses, statusLabels, onChange }: FiltersProps) {
  const set = (key: keyof LogFilters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <section className="rounded-lg border border-sky-100 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="grid gap-3 md:grid-cols-3">
        <Select label="Entidade" value={filters.entity} options={entities} onChange={(value) => set("entity", value)} />
        <Select label="Status" value={filters.status} options={statuses} optionLabels={statusLabels} onChange={(value) => set("status", value)} />
        <label className="text-xs font-medium text-muted">
          Texto/mensagem/erro
          <input
            value={filters.message}
            onChange={(event) => set("message", event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="Buscar texto"
          />
        </label>
      </div>
    </section>
  );
}

export function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-medium text-muted">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}

export function Select({
  label,
  value,
  options,
  optionLabels = {},
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  optionLabels?: Partial<Record<string, string>>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-medium text-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
