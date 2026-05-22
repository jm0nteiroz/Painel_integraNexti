import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { authService } from "../services/authService";
import type { ClientRecord, DatabaseInfo } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const emptyForm = {
  id: "",
  name: "",
  email: "",
  active: true,
  databaseNames: [] as string[],
  notes: "",
};

export function ClientManagementPage({ databases }: { databases: DatabaseInfo[] }) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const load = async () => setClients(await authService.listClients());

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        active: form.active,
        databaseNames: form.databaseNames,
        notes: form.notes,
      };
      if (form.id) {
        await authService.updateClient(form.id, payload);
        setMessage("Cliente atualizado.");
      } else {
        await authService.createClient(payload);
        setMessage("Cliente cadastrado.");
      }
      setForm(emptyForm);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar cliente.");
    }
  };

  const edit = (client: ClientRecord) => setForm({
    id: client.id,
    name: client.name,
    email: client.email,
    active: client.active,
    databaseNames: client.databaseNames,
    notes: client.notes,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Cadastro de Cliente</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
            <Field label="Nome do cliente"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Email principal"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="size-4 accent-cyan-400" />
              Cliente ativo
            </label>
            <Field label="Observação">
              <Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Opcional" />
            </Field>
            <div className="lg:col-span-2">
              <p className="mb-2 text-xs font-medium text-muted">Bancos vinculados</p>
              <div className="grid gap-2 md:grid-cols-2">
                {databases.map((database) => (
                  <label key={database.name} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-white/5 p-2 text-sm text-slate-100">
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
            </div>
            <div className="flex gap-2 lg:col-span-2">
              <Button type="submit"><Save size={16} /> {form.id ? "Salvar alterações" : "Cadastrar cliente"}</Button>
              {form.id ? <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>Cancelar</Button> : null}
            </div>
          </form>
          {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Clientes cadastrados</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {clients.map((client) => (
              <article key={client.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-white/5 p-3">
                <div>
                  <p className="font-semibold text-ink">{client.name}</p>
                  <p className="text-sm text-muted">{client.email}</p>
                  <p className="text-xs text-muted">{client.databaseNames.join(", ") || "Sem bancos vinculados"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${client.active ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>{client.active ? "Ativo" : "Inativo"}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => edit(client)}>Editar</Button>
                  <Button type="button" variant={client.active ? "danger" : "outline"} size="sm" onClick={async () => { await authService.updateClient(client.id, { active: !client.active }); await load(); }}>
                    {client.active ? "Inativar" : "Reativar"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="space-y-2">{label}{children}</Label>;
}
