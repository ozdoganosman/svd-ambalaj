'use client';

import { useCallback, useEffect, useState } from "react";
import { apiFetch, registerUnauthorizedHandler, setAdminAuthToken } from "@/lib/admin-api";

const DISABLE_ADMIN_AUTH = true;

const TOKEN_STORAGE_KEY = "svd_admin_token";

type AdminGuardProps = {
  children: React.ReactNode;
};

type AuthState = {
  loading: boolean;
  authorized: boolean;
  username: string | null;
  error: string | null;
};

function ProtectedAdminGuard({ children }: AdminGuardProps) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authorized: false,
    username: null,
    error: null,
  });
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  const resetAuth = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setAdminAuthToken(null);
    setState({ loading: false, authorized: false, username: null, error: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın." });
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(resetAuth);
    return () => registerUnauthorizedHandler(null);
  }, [resetAuth]);

  useEffect(() => {
    const bootstrap = async () => {
      if (typeof window === "undefined") {
        return;
      }
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      setAdminAuthToken(storedToken);
      try {
        const me = await apiFetch<{ username: string }>("/auth/me");
        setState({ loading: false, authorized: true, username: me.username, error: null });
      } catch (error) {
        console.error("Auth bootstrap error", error);
        resetAuth();
      }
    };

    bootstrap();
  }, [resetAuth]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiFetch<{ token: string; expiresAt: number }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password,
        }),
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      }
      setAdminAuthToken(response.token);
      const me = await apiFetch<{ username: string }>("/auth/me");
      setState({ loading: false, authorized: true, username: me.username, error: null });
      setCredentials({ username: "", password: "" });
    } catch (error) {
      console.error("Login failed", error);
      setAdminAuthToken(null);
      setState({
        loading: false,
        authorized: false,
        username: null,
        error: (error as Error).message || "Giriş başarısız",
      });
    }
  };

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="rounded-xl bg-white px-6 py-4 text-sm text-slate-600 shadow">Yükleniyor...</div>
      </div>
    );
  }

  if (!state.authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900">Yönetici Girişi</h1>
            <p className="text-sm text-slate-600">Lütfen yönetici hesap bilgilerinizi girin.</p>
          </div>
          {state.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="admin-username">
              Kullanıcı Adı
            </label>
            <input
              id="admin-username"
              name="username"
              type="text"
              value={credentials.username}
              onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="admin-password">
              Şifre
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminGuard({ children }: AdminGuardProps) {
  if (DISABLE_ADMIN_AUTH) {
    return <>{children}</>;
  }

  return <ProtectedAdminGuard>{children}</ProtectedAdminGuard>;
}

