import { LogOut, Video } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/button";
import { NAV_ITEMS, SECONDARY_NAV_ITEM } from "./navigation";

function getNavClassName(isActive: boolean): string {
  return [
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  ].join(" ");
}

export function AppLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-background px-4 py-5 md:flex md:flex-col">
        <div className="flex h-10 items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Video className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">VideoFlow</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => getNavClassName(isActive)}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2">
          <NavLink
            to={SECONDARY_NAV_ITEM.path}
            className={({ isActive }) => getNavClassName(isActive)}
          >
            <SECONDARY_NAV_ITEM.icon className="h-4 w-4" aria-hidden="true" />
            {SECONDARY_NAV_ITEM.label}
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start px-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] md:ml-64 md:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 md:px-8">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-6">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                ].join(" ")
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
