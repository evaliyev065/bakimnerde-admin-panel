import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest } from "../lib/api";

export type TenantType = "PLATFORM" | "CPO" | "CONTRACTOR";
export interface Principal {
  userId: string; tenantId: string; tenantKey: string; tenantName: string;
  tenantType: TenantType; name: string; email: string; role: string;
}
interface AuthValue {
  principal: Principal | null;
  loading: boolean;
  companyLogin(email: string, password: string): Promise<void>;
  platformLogin(email: string, password: string): Promise<void>;
  logout(): void;
}
const AuthContext = createContext<AuthValue | null>(null);
const TOKEN_KEY = "bakimnerde_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionStorage.getItem(TOKEN_KEY)));
  useEffect(() => {
    if (!sessionStorage.getItem(TOKEN_KEY)) return;
    apiRequest<Principal>("/auth-me")
      .then((value) => {
        if (value.role === "FIELD_WORKER") throw new Error("Saha ekibi yalnız mobil uygulamayı kullanabilir.");
        setPrincipal(value);
      })
      .catch(() => sessionStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);
  async function authenticate(path: string, email: string, password: string) {
    const result = await apiRequest<{ token: string; principal: Principal }>(path, { method: "POST", body: JSON.stringify({ email, password }) });
    sessionStorage.setItem(TOKEN_KEY, result.token);
    setPrincipal(result.principal);
  }
  const value = useMemo<AuthValue>(() => ({
    principal, loading,
    companyLogin: (email, password) => authenticate("/auth-company-login", email, password),
    platformLogin: (email, password) => authenticate("/auth-platform-login", email, password),
    logout() { sessionStorage.removeItem(TOKEN_KEY); setPrincipal(null); },
  }), [loading, principal]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error("AuthProvider bulunamadı.");
  return value;
}
