import type { ExecutionStatus, LogStatus } from "../types";

type BadgeProps = {
  status: LogStatus | ExecutionStatus;
  children: string;
};

const styles: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  error: "bg-rose-50 text-rose-700 ring-rose-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  ignored: "bg-slate-100 text-slate-700 ring-slate-200",
  analyzed: "bg-blue-50 text-blue-700 ring-blue-200",
  reprocess: "bg-violet-50 text-violet-700 ring-violet-200",
  running: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  partial: "bg-orange-50 text-orange-700 ring-orange-200",
};

export function Badge({ status, children }: BadgeProps) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles[status]}`}>
      {children}
    </span>
  );
}
