import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../api/errorMessage";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuthStore } from "../store/authStore";

interface LocationState {
  from?: {
    pathname?: string;
  };
}

function getRedirectPath(state: unknown): string {
  const locationState = state as LocationState | null;
  return locationState?.from?.pathname ?? "/dashboard";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({
        email,
        password,
      });
      navigate(getRedirectPath(location.state), { replace: true });
    } catch (submitError) {
      setError(
        getApiErrorMessage(
          submitError,
          "Unable to sign in with those credentials.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <form
        className="w-full max-w-sm rounded-md border border-border bg-background p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-semibold">VideoFlow</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage scheduled video posts.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            <span>Email</span>
            <Input
              autoComplete="email"
              inputMode="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Password</span>
            <Input
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>

        {error !== null ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button className="mt-6 w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link className="font-medium text-primary" to="/register">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
