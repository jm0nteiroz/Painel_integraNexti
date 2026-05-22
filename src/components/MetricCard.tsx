import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon?: LucideIcon;
};

export function MetricCard({ title, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-sky-100 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
        </div>
        {Icon ? (
          <div className="grid size-10 place-items-center rounded-lg bg-green-50 text-brand ring-1 ring-green-100">
            <Icon size={20} />
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted">{detail}</p>
    </article>
  );
}
