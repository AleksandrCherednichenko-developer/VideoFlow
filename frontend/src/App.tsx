import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "./routes/AppRoutes";
import { useAuthStore } from "./store/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface AuthBootstrapProps {
  children: ReactNode;
}

function AuthBootstrap({ children }: AuthBootstrapProps) {
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  return children;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <AppRoutes />
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
