import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  if (isBootstrapping) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-background px-4 text-sm font-medium text-muted-foreground"
        role="status"
      >
        Loading session...
      </div>
    );
  }

  if (accessToken === null) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
