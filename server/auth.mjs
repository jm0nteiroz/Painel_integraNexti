import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const storePath = path.resolve("server/auth-store.json");
const sessions = new Map();
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAuthStoreTable = process.env.SUPABASE_AUTH_STORE_TABLE ?? "integranexti_auth_store";

export async function ensureAuthStore() {
  const existing = await readStoreRaw();
  if (existing) return;

  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "Teste123@";
  const admin = await makeUser({
    name: "Admin Maxsystem",
    email: process.env.ADMIN_EMAIL ?? "admin@maxsystem.com.br",
    password,
    role: "admin",
    databaseNames: [],
  });
  await writeStore({ users: [admin], clients: [] });
}

async function readStoreRaw() {
  if (isSupabaseAuthStoreEnabled()) {
    return readSupabaseStore();
  }

  try {
    await fs.access(storePath);
    return JSON.parse(await fs.readFile(storePath, "utf-8"));
  } catch {
    return null;
  }
}

export async function login(email, password) {
  const store = await readStore();
  const user = store.users.find((item) => item.email.toLowerCase() === String(email).toLowerCase() && item.active);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, createdAt: Date.now() });
  return { token, user: publicUser(user) };
}

export async function authenticateToken(token) {
  const session = sessions.get(token);
  if (!session) return null;
  const store = await readStore();
  const user = store.users.find((item) => item.id === session.userId && item.active);
  return user ? publicUser(user) : null;
}

export function logout(token) {
  sessions.delete(token);
}

export async function listUsers() {
  const store = await readStore();
  return store.users.map(publicUser);
}

export async function listClients() {
  const store = await readStore();
  return (store.clients ?? []).map(publicClient);
}

export async function createClient(input) {
  const store = await readStore();
  const client = makeClient(input);
  store.clients = [...(store.clients ?? []), client];
  await writeStore(store);
  return publicClient(client);
}

export async function updateClient(id, input) {
  const store = await readStore();
  const clients = store.clients ?? [];
  const index = clients.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Cliente não encontrado.");
  clients[index] = {
    ...clients[index],
    name: input.name ?? clients[index].name,
    email: input.email ?? clients[index].email,
    active: typeof input.active === "boolean" ? input.active : clients[index].active,
    databaseNames: Array.isArray(input.databaseNames) ? input.databaseNames : clients[index].databaseNames,
    notes: input.notes ?? clients[index].notes,
    updatedAt: new Date().toISOString(),
  };
  store.clients = clients;
  await writeStore(store);
  return publicClient(clients[index]);
}

export async function createUser(input) {
  const store = await readStore();
  if (!input?.name || !input?.email || !input?.password || !input?.role) {
    throw new Error("Nome, e-mail, senha e perfil são obrigatórios.");
  }
  if (store.users.some((item) => item.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("E-mail já cadastrado.");
  }
  const user = await makeUser(input);
  store.users.push(user);
  await writeStore(store);
  return publicUser(user);
}

export async function updateUser(id, input) {
  const store = await readStore();
  const index = store.users.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Usuário não encontrado.");
  const current = store.users[index];
  store.users[index] = {
    ...current,
    name: input.name ?? current.name,
    email: input.email ?? current.email,
    role: input.role ?? current.role,
    active: typeof input.active === "boolean" ? input.active : current.active,
    databaseNames: Array.isArray(input.databaseNames) ? input.databaseNames : current.databaseNames,
    routinePrograms: Array.isArray(input.routinePrograms) ? input.routinePrograms : current.routinePrograms,
    passwordHash: input.password ? hashPassword(input.password) : current.passwordHash,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return publicUser(store.users[index]);
}

export function canAccessDatabase(user, database) {
  if (!user || !database) return false;
  if (user.role === "admin") return true;
  return user.databaseNames.includes(database);
}

async function readStore() {
  let store = await readStoreRaw();
  if (!store) {
    await ensureAuthStore();
    store = await readStoreRaw();
  }
  if (!store) throw new Error("Store de autenticação indisponível.");
  if (!Array.isArray(store.clients)) store.clients = [];
  return store;
}

async function writeStore(store) {
  if (isSupabaseAuthStoreEnabled()) {
    await writeSupabaseStore(store);
    return;
  }

  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}

function isSupabaseAuthStoreEnabled() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function readSupabaseStore() {
  const response = await fetch(`${supabaseUrl}/rest/v1/${supabaseAuthStoreTable}?id=eq.default&select=data&limit=1`, {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Falha ao ler usuários no Supabase: ${response.status}`);
  }

  const rows = await response.json();
  return rows[0]?.data ?? null;
}

async function writeSupabaseStore(store) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${supabaseAuthStoreTable}?on_conflict=id`, {
    method: "POST",
    headers: supabaseHeaders({ Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify({
      id: "default",
      data: store,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao gravar usuários no Supabase: ${response.status}`);
  }
}

async function makeUser(input) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: hashPassword(input.password),
    role: input.role,
    active: input.active ?? true,
    databaseNames: input.role === "admin" ? [] : input.databaseNames ?? [],
    routinePrograms: input.role === "admin" ? [] : input.routinePrograms ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

function makeClient(input) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    active: input.active ?? true,
    databaseNames: input.databaseNames ?? [],
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2$${salt}$${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [, salt, hash] = String(passwordHash).split("$");
  if (!salt || !hash) return false;
  const candidate = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    databaseNames: user.databaseNames ?? [],
    routinePrograms: user.routinePrograms ?? [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function publicClient(client) {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    active: client.active,
    databaseNames: client.databaseNames ?? [],
    notes: client.notes ?? "",
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}
