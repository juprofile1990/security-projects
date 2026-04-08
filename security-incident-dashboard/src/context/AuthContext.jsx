import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/constants";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const handleUnauthorized = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : `Login failed (${res.status})`
      );
    }
    setToken(data.token);
    setUser(data.user);
  }, []);

  const apiRequest = useCallback(
    async (path, options = {}) => {
      const { method = "GET", body, headers: extraHeaders = {} } = options;

      if (!token) {
        handleUnauthorized();
        throw new Error("Not authenticated");
      }

      const headers = { ...extraHeaders };
      const isJsonBody =
        body !== undefined &&
        body !== null &&
        typeof body === "object" &&
        !(body instanceof FormData);

      if (isJsonBody) {
        headers["Content-Type"] = "application/json";
      }

      headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body:
          isJsonBody ? JSON.stringify(body) : body === undefined ? undefined : body,
      });

      if (res.status === 401) {
        handleUnauthorized();
        throw new Error("Session expired or unauthorized");
      }

      return res;
    },
    [token, handleUnauthorized]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      apiRequest,
      isAuthenticated: Boolean(token),
    }),
    [token, user, login, logout, apiRequest]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
