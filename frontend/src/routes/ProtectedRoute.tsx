import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);

  if (accessToken === null) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
