import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Save, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import type { AuthUser, ClientRecord, DatabaseInfo, RoutineInfo, UserRole } from "../types";
import { authService } from "../services/authService";

const emptyForm = {
  id: "",
  name: "",
  email: "",
  password: "",
  role: "client" as UserRole,
  active: true,
  databaseNames: [] as string[],
  routinePrograms: [] as string[],
};

export function UserManagementPage({ databases, routines }: { databases: DatabaseInfo[]; routines: RoutineInfo[] }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [statusTab, setStatusTab] = useState<"active" | "inactive">("active");
  const [message, setMessage] = useState("");

  const load = async () => {
    const [loadedUsers, loadedClients] = await Promise.all([authService.listUsers(), authService.listClients()]);
    setUsers(loadedUsers);
    setClients(loadedClients);
  };

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      if (form.id) {
        await authService.updateUser(form.id, {
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          role: form.role,
          active: form.active,
          databaseNames: form.role === "admin" ? [] : form.databaseNames,
          routinePrograms: form.role === "admin" ? [] : form.routinePrograms,
        });
        setMessage("Usuário atualizado.");
      } else {
        await authService.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          active: form.active,
          databaseNames: form.role === "admin" ? [] : form.databaseNames,
          routinePrograms: form.role === "admin" ? [] : form.routinePrograms,
        });
        setMessage("Usuário criado.");
      }
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar usuário.");
    }
  };

  const edit = (user: AuthUser) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: user.active,
      databaseNames: user.databaseNames,
      routinePrograms: user.routinePrograms ?? [],
    });
    setShowForm(true);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setShowForm(true);
    setMessage("");
  };

  const filteredUsers = users.filter((user) => statusTab === "active" ? user.active : !user.active);

  return (
    <div className="space-y-6">
      {showForm ? <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Editar Usuário" : "Criar Usuário"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
            <Field label="Nome"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
            <Field label={form.id ? "Nova senha (opcional)" : "Senha inicial"}><Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!form.id} /></Field>
            <Field label="Perfil">
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole, databaseNames: event.target.value === "admin" ? [] : form.databaseNames, routinePrograms: event.target.value === "admin" ? [] : form.routinePrograms })} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink">
                <option value="client">Cliente</option>
                <option value="admin">Admin Maxsystem</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="size-4 accent-cyan-400" />
              Usuário ativo
            </label>
            {form.role === "client" ? (
              <div className="lg:col-span-2">
                {clients.length ? (
                  <>
                    <p className="mb-2 text-xs font-medium text-muted">Clientes vinculados</p>
                    <div className="mb-4 grid gap-2 md:grid-cols-2">
                      {clients.map((client) => (
                        <label key={client.id} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-white/5 p-2 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={client.databaseNames.every((name) => form.databaseNames.includes(name))}
                            onChange={(event) => {
                              const names = new Set(form.databaseNames);
                              client.databaseNames.forEach((name) => event.target.checked ? names.add(name) : names.delete(name));
                              setForm({ ...form, databaseNames: [...names] });
                            }}
                            className="size-4 accent-cyan-400"
                          />
                          {client.name}
                        </label>
                      ))}
                    </div>
                  </>
                ) : null}
                <p className="mb-2 text-xs font-medium text-muted">Bancos vinculados</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {databases.map((database) => (
                    <label key={database.name} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={form.databaseNames.includes(database.name)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...form.databaseNames, database.name]
                            : form.databaseNames.filter((name) => name !== database.name);
                          setForm({ ...form, databaseNames: next });
                        }}
                        className="size-4 accent-cyan-400"
                      />
                      {database.name}
                    </label>
                  ))}
                </div>
                {routines.length ? (
                  <>
                    <p className="mb-2 mt-4 text-xs font-medium text-muted">Serviços visíveis para o cliente</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {routines.map((routine) => {
                        const key = normalizeRoutineKey(routine.program);
                        return (
                          <label key={`${routine.id}-${key}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-sm text-ink">
                            <input
                              type="checkbox"
                              checked={form.routinePrograms.includes(key)}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...form.routinePrograms, key]
                                  : form.routinePrograms.filter((program) => program !== key);
                                setForm({ ...form, routinePrograms: next });
                              }}
                              className="size-4 accent-cyan-400"
                            />
                            {routine.name}
                          </label>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="flex gap-2 lg:col-span-2">
              <Button type="submit"><Save size={16} /> {form.id ? "Salvar alterações" : "Criar usuário"}</Button>
              {form.id ? <Button type="button" variant="outline" onClick={() => { setForm(emptyForm); setShowForm(true); }}>Cancelar</Button> : null}
            </div>
          </form>
          {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
        </CardContent>
      </Card> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Usuários criados</CardTitle>
              <p className="mt-1 text-xs text-muted">{filteredUsers.length} usuários {statusTab === "active" ? "ativos" : "inativos"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/70 p-1">
                <button type="button" onClick={() => setStatusTab("active")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${statusTab === "active" ? "bg-emerald-500/15 text-emerald-700" : "text-muted hover:bg-white"}`}>
                  Ativos
                </button>
                <button type="button" onClick={() => setStatusTab("inactive")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${statusTab === "inactive" ? "bg-rose-500/15 text-rose-700" : "text-muted hover:bg-white"}`}>
                  Inativos
                </button>
              </div>
              <Button type="button" size="sm" onClick={startCreate}><UserPlus size={14} /> Novo usuário</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div>
                  <p className="font-semibold text-ink">{user.name} <span className="text-xs text-muted">({user.role === "admin" ? "Admin" : "Cliente"})</span></p>
                  <p className="text-sm text-muted">{user.email}</p>
                  <p className="text-xs text-muted">{user.role === "admin" ? "Maxsystem" : user.databaseNames.join(", ") || "Sem bancos"}</p>
                  {user.role === "client" ? <p className="text-xs text-muted">{user.routinePrograms?.length ? `${user.routinePrograms.length} serviços liberados` : "Todos os serviços liberados"}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.active ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>{user.active ? "Ativo" : "Inativo"}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => edit(user)}><UserPlus size={14} /> Editar</Button>
                  <Button type="button" variant={user.active ? "danger" : "outline"} size="sm" onClick={async () => { await authService.updateUser(user.id, { active: !user.active }); await load(); }}>
                    {user.active ? "Inativar" : "Reativar"}
                  </Button>
                </div>
              </article>
            ))}
            {!filteredUsers.length ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-muted">
                Nenhum usuário {statusTab === "active" ? "ativo" : "inativo"} encontrado.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <Label className="space-y-2">{label}{children}</Label>;
}

function normalizeRoutineKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
