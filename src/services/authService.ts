import type { AuthUser, ClientRecord, UserRole } from "../types";
import { getAuthToken, setAuthToken } from "./logRepository";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

type UserPayload = {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  active: boolean;
  databaseNames: string[];
  routinePrograms: string[];
};

type ClientPayload = {
  name: string;
  email: string;
  active: boolean;
  databaseNames: string[];
  notes: string;
};

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "Falha na autenticação.");
  }
  return response.json();
}

export const authService = {
  async login(email: string, password: string) {
    const result = await authFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(result.token);
    return result.user;
  },
  async me() {
    if (!getAuthToken()) return null;
    try {
      const result = await authFetch<{ user: AuthUser }>("/api/auth/me");
      return result.user;
    } catch {
      setAuthToken("");
      return null;
    }
  },
  async logout() {
    if (getAuthToken()) {
      await authFetch<{ ok: true }>("/api/auth/logout", { method: "POST" }).catch(() => null);
    }
    setAuthToken("");
  },
  listUsers() {
    return authFetch<AuthUser[]>("/api/users");
  },
  createUser(payload: UserPayload) {
    return authFetch<AuthUser>("/api/users", { method: "POST", body: JSON.stringify(payload) });
  },
  updateUser(id: string, payload: Partial<UserPayload>) {
    return authFetch<AuthUser>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  listClients() {
    return authFetch<ClientRecord[]>("/api/clients");
  },
  createClient(payload: ClientPayload) {
    return authFetch<ClientRecord>("/api/clients", { method: "POST", body: JSON.stringify(payload) });
  },
  updateClient(id: string, payload: Partial<ClientPayload>) {
    return authFetch<ClientRecord>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
};
