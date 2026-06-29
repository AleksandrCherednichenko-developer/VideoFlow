import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../api/errorMessage";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuthStore } from "../store/authStore";

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        email,
        password,
        timezone,
      });
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(
        getApiErrorMessage(submitError, "Unable to create that account."),
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
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start scheduling video publications.
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
              autoComplete="new-password"
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Timezone</span>
            <Input
              required
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
          </label>
        </div>

        {error !== null ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button className="mt-6 w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating..." : "Create account"}
        </Button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium text-primary" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
