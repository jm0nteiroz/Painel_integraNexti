export const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value);

export const formatDateTime = (value: string | null) => {
  if (!value) return "Em andamento";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

export const formatCompactDateTime = (value: string | null) => {
  if (!value) return "Em andamento";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export const formatShortDate = (value: string | null) => {
  if (!value) return "Em andamento";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
};

export const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value);
