import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, ListTree, ServerCog, Users } from "lucide-react";
import type { AuthUser } from "../types";

const items = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "client"], group: "Operação" },
  { path: "/logs-integracao", label: "Logs da Integração", icon: ListTree, roles: ["admin", "client"], group: "Operação" },
  { path: "/rotinas-integracao", label: "Informações de Serviço", icon: ServerCog, roles: ["admin", "client"], group: "Operação" },
  { path: "/usuarios", label: "Gestão de Usuários", icon: Users, roles: ["admin"], group: "Admin Maxsystem" },
];

export function AppSidebar({ user, currentPath, onNavigate, collapsed, onToggle }: { user: AuthUser; currentPath: string; onNavigate: (path: string) => void; collapsed: boolean; onToggle: () => void }) {
  const visibleItems = items.filter((item) => item.roles.includes(user.role));
  const groups = [...new Set(visibleItems.map((item) => item.group))];

  return (
    <motion.aside
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: collapsed ? 72 : 320 }}
      transition={{ type: "spring", stiffness: 220, damping: 28, mass: 0.8 }}
      className="portal-sidebar fixed inset-y-0 left-0 z-20 flex h-screen shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-[#1b1815]/95 p-3 shadow-sm backdrop-blur"
    >
      <div className={`relative flex items-center ${collapsed ? "justify-center" : "justify-start"} px-1 py-3`}>
        <motion.button
          type="button"
          onClick={onToggle}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className={`flex min-w-0 items-center gap-3 rounded-xl text-left transition hover:bg-white/10 ${collapsed ? "justify-center p-0" : "p-1"}`}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#69c83a]/35 ring-1 ring-[#69c83a]/35 shadow-sm">
            <img src="/assets/maxsystem.avif" alt="MaxSystem" className="h-8 w-auto object-contain" />
          </span>
          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.div
                key="sidebar-brand"
                initial={{ opacity: 0, x: -12, filter: "blur(3px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -12, filter: "blur(3px)" }}
                transition={{ duration: 0.18 }}
                className="min-w-0"
              >
                <p className="truncate text-base font-semibold text-slate-100">Portal Maxsystem</p>
                <p className="truncate text-sm text-slate-400">IntegraNexti</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {collapsed ? (
          <motion.nav
            key="sidebar-collapsed-icons"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative mt-5 flex flex-col items-center gap-3"
          >
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = currentPath === item.path || (currentPath === "/" && item.path === "/dashboard");
              return (
                <motion.button
                  key={item.path}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => onNavigate(item.path)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  className={`grid size-11 place-items-center rounded-xl transition ${active ? "bg-[#1f4f06] text-[#a7f26f]" : "text-slate-300 hover:bg-white/10 hover:text-slate-100"}`}
                >
                  <Icon size={19} />
                </motion.button>
              );
            })}
          </motion.nav>
        ) : (
          <motion.div
            key="sidebar-content"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2 }}
            className="relative min-h-0"
          >
            <motion.nav
              className="mt-8 space-y-8"
              initial="closed"
              animate="open"
              variants={{
                open: { transition: { staggerChildren: 0.055, delayChildren: 0.03 } },
                closed: {},
              }}
            >
              {groups.map((group) => {
                const groupItems = visibleItems.filter((item) => item.group === group);
                return (
                  <div key={group} className="space-y-2">
                    <p className="px-2 text-xs font-semibold text-slate-500">{group}</p>
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      const active = currentPath === item.path || (currentPath === "/" && item.path === "/dashboard");
                      return (
                        <motion.button
                          key={item.path}
                          type="button"
                          onClick={() => onNavigate(item.path)}
                          variants={{
                            closed: { opacity: 0, x: -24 },
                            open: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
                          }}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active ? "bg-[#1f4f06] text-[#a7f26f]" : "text-slate-200 hover:bg-white/10 hover:text-slate-100"}`}
                        >
                          <Icon size={19} />
                          <span className="truncate">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                );
              })}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
