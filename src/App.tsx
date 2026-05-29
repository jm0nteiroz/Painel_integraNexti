import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, PanelLeft, Percent, RefreshCcw } from "lucide-react";
import { AppSidebar } from "./components/AppSidebar";
import { EntitySummaryPanel } from "./components/EntitySummaryPanel";
import { DateInput, Filters, Select } from "./components/Filters";
import { LogDetailDrawer } from "./components/LogDetailDrawer";
import { LogTable } from "./components/LogTable";
import { LoginPage } from "./components/LoginPage";
import { MetricCard } from "./components/MetricCard";
import { RoutinesPanel } from "./components/RoutinesPanel";
import { UserDropdown } from "./components/UserDropdown";
import { UserManagementPage } from "./components/UserManagementPage";
import { ZohoSalesIQ } from "./components/ZohoSalesIQ";
import { authService } from "./services/authService";
import { activeLogRepository } from "./services/logRepository";
import type { AuthUser, DashboardStats, DatabaseInfo, Execution, IntegrationEntityInfo, IntegrationLog, LogFilters, LogStatus, RoutineInfo } from "./types";
import { formatNumber, formatPercent, formatShortDate } from "./utils/format";
import { buildEntityStats, buildSummary, filterLogs, statusLabel } from "./utils/metrics";

const emptyFilters: LogFilters = {
  period: "30d",
  dateFrom: "",
  dateTo: "",
  entity: "",
  status: "",
  message: "",
};

const pageSize = 6;
const emptyStats: DashboardStats = {
  totalReceived: 0,
  processed: 0,
  success: 0,
  error: 0,
  pending: 0,
  successRate: 0,
  lastRun: null,
  byEntity: [],
};

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname === "/" ? "/dashboard" : window.location.pathname);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [entities, setEntities] = useState<IntegrationEntityInfo[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [routines, setRoutines] = useState<RoutineInfo[]>([]);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [filters, setFilters] = useState<LogFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const loadDatabaseData = async () => {
    if (!selectedDatabase || !user) return;
    try {
      const [loadedLogs, loadedExecutions, loadedEntities, loadedRoutines] = await Promise.all([
        activeLogRepository.listLogs(selectedDatabase),
        activeLogRepository.listExecutions(selectedDatabase),
        activeLogRepository.listEntities(selectedDatabase),
        activeLogRepository.listRoutines(selectedDatabase),
      ]);
      setLogs(loadedLogs);
      setExecutions(loadedExecutions);
      setEntities(loadedEntities);
      setRoutines(loadedRoutines);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Falha ao carregar dados reais.");
    }
  };

  const loadStats = async () => {
    if (!selectedDatabase || !user) return;
    try {
      setStats(await activeLogRepository.listStats(selectedDatabase, filters));
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Falha ao carregar totais reais.");
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadDatabaseData(), loadStats()]);
  };

  useEffect(() => {
    const lockedElements = new Set<HTMLElement>();
    const timers = new Set<number>();

    const lockElement = (element: HTMLElement) => {
      if (lockedElements.has(element) || element.getAttribute("aria-disabled") === "true") return;
      lockedElements.add(element);
      element.classList.add("click-locked");
      element.setAttribute("aria-disabled", "true");
      if (element instanceof HTMLButtonElement) {
        element.disabled = true;
      }

      const timer = window.setTimeout(() => {
        lockedElements.delete(element);
        element.classList.remove("click-locked");
        element.removeAttribute("aria-disabled");
        if (element instanceof HTMLButtonElement) {
          element.disabled = false;
        }
        timers.delete(timer);
      }, 1000);
      timers.add(timer);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("button, [role='menuitem']")
        : null;
      if (!target || target.dataset.noClickLock === "true") return;
      const haptics = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
      haptics.vibrate?.(12);
      window.setTimeout(() => lockElement(target), 0);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      timers.forEach((timer) => window.clearTimeout(timer));
      lockedElements.forEach((element) => {
        element.classList.remove("click-locked");
        element.removeAttribute("aria-disabled");
        if (element instanceof HTMLButtonElement) {
          element.disabled = false;
        }
      });
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", theme === "light");
  }, [theme]);

  useEffect(() => {
    authService.me().then((loadedUser) => {
      setUser(loadedUser);
      setAuthLoading(false);
      if (!loadedUser && window.location.pathname !== "/login") {
        window.history.replaceState(null, "", "/login");
        setCurrentPath("/login");
      }
    });
  }, []);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname === "/" ? "/dashboard" : window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (["/logs-operacoes", "/erros-entidade"].includes(currentPath)) {
      navigate("/logs-integracao");
      return;
    }
    if (user && currentPath === "/clientes") {
      navigate("/usuarios");
    }
    if (user && ["/usuarios"].includes(currentPath) && user.role !== "admin") {
      navigate("/dashboard");
    }
    if (user && currentPath === "/login") {
      navigate("/dashboard");
    }
  }, [currentPath, user]);

  useEffect(() => {
    if (!user) return;
    async function loadDatabases() {
      try {
        const loadedDatabases = await activeLogRepository.listDatabases();
        setDatabases(loadedDatabases);
        setSelectedDatabase((current) => {
          if (current && loadedDatabases.some((database) => database.name === current)) return current;
          return loadedDatabases[0]?.name || "";
        });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Falha ao carregar bancos disponíveis.");
      }
    }

    loadDatabases();
  }, [user]);

  useEffect(() => {
    if (!selectedDatabase || !user) return;

    loadDatabaseData();
  }, [selectedDatabase, user]);

  useEffect(() => {
    if (!selectedDatabase || !user) return;

    loadStats();
  }, [selectedDatabase, filters, user]);

  const filteredLogs = useMemo(() => filterLogs(logs, filters), [logs, filters]);
  const filteredLogsSummary = useMemo(() => buildSummary(filteredLogs), [filteredLogs]);
  const summary = stats.byEntity.length ? stats : buildSummary(logs);
  const selectedDatabaseInfo = databases.find((database) => database.name === selectedDatabase);

  const options = useMemo(() => {
    const unique = (values: Array<string | number | null>) =>
      [...new Set(values.filter(Boolean).map(String))].sort();

    return {
      entities: unique([...entities.map((entity) => entity.entity), ...stats.byEntity.map((item) => item.entity), ...logs.map((log) => log.entity)]),
      statuses: unique(logs.map((log) => log.status)),
    };
  }, [logs, entities, stats.byEntity]);

  const entityStats = useMemo(() => {
    const sourceStats = currentPath === "/logs-integracao"
      ? buildEntityStats(filteredLogs)
      : stats.byEntity;
    const byEntity = new Map(sourceStats.map((item) => [item.entity, item]));
    return options.entities.map((entity) => byEntity.get(entity) ?? { entity, total: 0, success: 0, error: 0, pending: 0 });
  }, [currentPath, filteredLogs, options.entities, stats.byEntity]);

  const updateStatus = async (id: string, status: LogStatus) => {
    const targetLog = logs.find((log) => log.id === id);
    if (status === "reprocess" && targetLog && selectedDatabase) {
      try {
        await activeLogRepository.reprocessLog(selectedDatabase, targetLog);
        const [loadedLogs, loadedStats] = await Promise.all([
          activeLogRepository.listLogs(selectedDatabase),
          activeLogRepository.listStats(selectedDatabase, filters),
        ]);
        setLogs(loadedLogs);
        setStats(loadedStats);
        setRoutines(await activeLogRepository.listRoutines(selectedDatabase));
        setLoadError(null);
        return;
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Falha ao solicitar reprocessamento.");
      }
    }

    setLogs((current) =>
      current.map((log) =>
        log.id === id
          ? {
              ...log,
              status,
              message:
                status === "analyzed"
                  ? "Registro marcado como analisado localmente."
                  : status === "ignored"
                    ? "Registro ignorado localmente."
                    : status === "reprocess"
                      ? "Reprocessamento solicitado localmente."
                      : log.message,
            }
          : log,
      ),
    );
  };

  const updateNextiId = async (log: IntegrationLog, nextiId: string) => {
    if (!selectedDatabase) return;
    try {
      await activeLogRepository.updateNextiId(selectedDatabase, log, nextiId);
      const [loadedLogs, loadedStats] = await Promise.all([
        activeLogRepository.listLogs(selectedDatabase),
        activeLogRepository.listStats(selectedDatabase, filters),
      ]);
      setLogs(loadedLogs);
      setStats(loadedStats);
      setSelectedLog((current) => current ? { ...current, nextiId, response: { ...current.response, nextiId } } : current);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Falha ao atualizar ID Nexti.");
      throw error;
    }
  };

  const onFiltersChange = (nextFilters: LogFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const setFilter = (key: keyof LogFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  const integrationSourceTitle = selectedDatabaseInfo?.sourceMode === "senior" ? "Senior" : "Protheus";

  const navigate = (path: string) => {
    if (path === "/clientes") path = "/usuarios";
    if (["/usuarios"].includes(path) && user?.role !== "admin") path = "/dashboard";
    if (["/logs-operacoes", "/erros-entidade"].includes(path)) path = "/logs-integracao";
    window.history.pushState(null, "", path);
    setCurrentPath(path);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    window.history.replaceState(null, "", "/login");
    setCurrentPath("/login");
  };

  if (authLoading) {
    return <div className="grid min-h-screen place-items-center bg-surface text-ink">Carregando...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={(loggedUser) => { setUser(loggedUser); navigate("/dashboard"); }} />;
  }

  const showDashboard = currentPath === "/dashboard" || currentPath === "/";
  const showLogsIntegration = currentPath === "/logs-integracao";
  const showRoutines = currentPath === "/rotinas-integracao";
  const showUsers = currentPath === "/usuarios" && user.role === "admin";
  const pageTitle = showDashboard
    ? "Dashboard"
    : showLogsIntegration
      ? "Logs da Integração"
      : showRoutines
        ? "Informações de Serviço"
        : showUsers
          ? "Gestão de Usuários"
          : "Gestão de Usuários";
  const pageSubtitle = showDashboard || showLogsIntegration
    ? `Painel de logs da integração ${integrationSourceTitle} → Nexti`
    : showRoutines
      ? "Acompanhamento das rotinas, intervalos e atrasos da integração."
      : "Usuários, perfis e permissões de acesso ao painel.";
  const dashboardSummary = {
    ...summary,
    lastRun: latestValue(routines
      .filter((routine) => routine.active && routine.lastRunAt)
      .map((routine) => routine.lastRunAt)
      .sort()) ?? summary.lastRun,
  };
  const currentSummary = dashboardSummary;

  return (
    <div className="relative min-h-screen bg-surface">
      <img src="/assets/maxsystem.avif" alt="" className="maxsystem-watermark" aria-hidden="true" />
      <AppSidebar user={user} currentPath={currentPath} onNavigate={navigate} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <div className="min-w-0 transition-[margin] duration-200" style={{ marginLeft: sidebarCollapsed ? 72 : 320 }}>
      <header className="portal-topbar relative z-10 border-b border-slate-800 bg-[#1b1815] shadow-sm">
        <div className="flex flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="portal-icon-button mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-slate-200 hover:bg-white/10"
              aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              <PanelLeft size={18} />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">INTEGRANEXTI</p>
              <h1 className="mt-0.5 text-3xl font-semibold leading-tight text-slate-100 md:text-4xl">{pageTitle}</h1>
              <p className="mt-1 text-sm text-muted md:text-base">{pageSubtitle}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="w-full text-xs font-medium text-muted sm:w-60 lg:w-72">
              Banco
              <select
                value={selectedDatabase}
                onChange={(event) => setSelectedDatabase(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-white/5 px-3 text-sm font-medium text-slate-100 outline-none transition focus:border-[#69c83a] focus:ring-2 focus:ring-[#69c83a]/20"
              >
                {databases.map((database) => (
                  <option key={database.name} value={database.name}>
                    {database.name}
                  </option>
                ))}
              </select>
            </label>
            <UserDropdown user={user} theme={theme} onToggleTheme={() => setTheme((value) => value === "dark" ? "light" : "dark")} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {loadError ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </section>
        ) : null}
        {(showDashboard || showLogsIntegration) ? <section className="rounded-lg border border-slate-800 bg-white/5 p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[180px_180px_180px_auto] md:items-end md:justify-start">
            <Select label="Período" value={filters.period} options={["24h", "7d", "30d", "custom"]} optionLabels={{ "24h": "24 horas", "7d": "7 dias", "30d": "30 dias", custom: "Personalizado" }} onChange={(value) => setFilter("period", value)} />
            {filters.period === "custom" ? (
              <>
                <DateInput label="Data inicial" value={filters.dateFrom} onChange={(value) => setFilter("dateFrom", value)} />
                <DateInput label="Data final" value={filters.dateTo} onChange={(value) => setFilter("dateTo", value)} />
              </>
            ) : (
              <>
                <div className="hidden md:block" />
                <div className="hidden md:block" />
              </>
            )}
            <button type="button" onClick={refreshAll} className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-lg border border-slate-700 bg-white/5 px-3 text-xs font-semibold text-slate-100 transition hover:bg-white/10">
              <RefreshCcw size={14} /> Atualizar métricas
            </button>
          </div>
        </section> : null}

        {showDashboard ? <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard title="Total recebido" value={formatNumber(currentSummary.totalReceived)} detail="Registros encontrados" icon={Database} />
          <MetricCard title="Concluído" value={formatNumber(currentSummary.success)} detail="Tratados como concluídos" icon={CheckCircle2} />
          <MetricCard title="Pendente" value={formatNumber(currentSummary.pending)} detail="Pendentes ou irão executar" icon={Clock3} />
          <MetricCard title="Erro" value={formatNumber(currentSummary.error)} detail="Status E" icon={AlertTriangle} />
          <MetricCard title="Taxa de sucesso" value={formatPercent(currentSummary.successRate)} detail="Concluído sobre recebidos" icon={Percent} />
          <MetricCard title="Última execução" value={formatShortDate(currentSummary.lastRun)} detail="Rotinas ativas" />
        </section> : null}

        {showDashboard ? <EntitySummaryPanel title="Entidades da Integração" stats={entityStats} logs={filteredLogs} mode="all" onView={setSelectedLog} onStatusChange={updateStatus} showOpenButton={false} showEntityFilter={false} /> : null}

        {showRoutines ? <RoutinesPanel
          routines={routines}
          userRole={user.role}
          onRefresh={loadDatabaseData}
          onToggle={async (routine) => {
            try {
              await activeLogRepository.updateRoutineStatus(selectedDatabase, routine.id, !routine.active);
              await loadDatabaseData();
            } catch (error) {
              setLoadError(error instanceof Error ? error.message : "Falha ao atualizar rotina.");
            }
          }}
        /> : null}

        {showLogsIntegration ? <div className="space-y-4">
          <Filters filters={filters} entities={options.entities} statuses={["success", "pending", "error"]} statusLabels={statusLabel} onChange={onFiltersChange} />
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Dados totais" value={formatNumber(filteredLogsSummary.totalReceived)} detail="Registros filtrados" icon={Database} />
            <MetricCard title="Dados concluídos" value={formatNumber(filteredLogsSummary.success)} detail="Concluídos na busca" icon={CheckCircle2} />
            <MetricCard title="Dados pendentes" value={formatNumber(filteredLogsSummary.pending)} detail="Pendentes na busca" icon={Clock3} />
            <MetricCard title="Dados erros" value={formatNumber(filteredLogsSummary.error)} detail="Erros na busca" icon={AlertTriangle} />
          </section>
          <button type="button" onClick={refreshAll} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-white/5 px-3 text-xs font-semibold text-slate-100 transition hover:bg-white/10">
            <RefreshCcw size={14} /> Atualizar busca
          </button>
        </div> : null}

        {showLogsIntegration ? <LogTable
          title="Logs da Integração"
          logs={filteredLogs}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onView={setSelectedLog}
          onStatusChange={updateStatus}
        /> : null}

        {showUsers ? <UserManagementPage databases={databases} routines={routines} /> : null}
        <footer className="pb-4 text-center text-xs text-muted">
          João Pedro Monteiro © 2026. Todos os direitos reservados. | Versão 1.0.0
        </footer>

      </main>

      <LogDetailDrawer log={selectedLog} user={user} onUpdateNextiId={updateNextiId} onClose={() => setSelectedLog(null)} />
      <ZohoSalesIQ enabled={user.role === "client"} />
      </div>
    </div>
  );
}

function latestValue<T>(values: T[]) {
  return values.length ? values[values.length - 1] : null;
}
