import { LogOut, Moon, Sun, User } from "lucide-react";
import type { AuthUser } from "../types";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

export function UserDropdown({ user, theme, onToggleTheme, onLogout }: { user: AuthUser; theme: "dark" | "light"; onToggleTheme: () => void; onLogout: () => void }) {
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="portal-user-trigger h-11 max-w-[280px] gap-3 rounded-xl px-2 text-slate-100 hover:bg-white/10" aria-label="Abrir menu do usuário">
          <Avatar className="size-9">
            <AvatarFallback className="bg-[#1f4f06] text-sm font-semibold text-[#a7f26f]">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[190px] truncate text-sm font-semibold lg:inline">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-3 py-2">
          <p className="truncate text-base font-semibold">{user.name}</p>
          <p className="truncate text-sm text-slate-400">{user.email}</p>
          <Badge className="mt-2">{user.role === "admin" ? "Admin" : "Cliente"}</Badge>
        </div>
        <DropdownMenuSeparator className="my-1 h-px bg-slate-700" />
        <DropdownMenuItem>
          <User size={16} />
          Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleTheme}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout} className="text-rose-200 focus:text-rose-100">
          <LogOut size={16} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
