import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest } from "../lib/api";

export type TenantType = "PLATFORM" | "MANUFACTURER" | "CPO" | "CONTRACTOR";
export interface Principal {
  userId: string;
  tenantId: string;
  tenantKey: string;
  tenantName: string;
  tenantType: TenantType;
  name: string;
  email: string;
  role: string;
}

interface AuthValue {
  principal: Principal | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("bakimnerde_token")));

  useEffect(() => {
    if (!localStorage.getItem("bakimnerde_token")) return;
    apiRequest<Principal>("/auth-me")
      .then(setPrincipal)
      .catch(() => localStorage.removeItem("bakimnerde_token"))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthValue>(() => ({
    principal,
    loading,
    async login(email, password) {
      const result = await apiRequest<{ token: string; principal: Principal }>("/auth-login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("bakimnerde_token", result.token);
      setPrincipal(result.principal);
    },
    logout() {
      localStorage.removeItem("bakimnerde_token");
      setPrincipal(null);
    },
  }), [loading, principal]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error("AuthProvider bulunamadı.");
  return value;
}
