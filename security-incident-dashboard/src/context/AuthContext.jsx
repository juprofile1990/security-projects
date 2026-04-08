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

const SESSION_TOKEN_KEY = "ic_token";
const SESSION_USER_KEY  = "ic_user";

function readSession() {
  try {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const user  = JSON.parse(sessionStorage.getItem(SESSION_USER_KEY) || "null");
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function writeSession(token, user) {
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);
    }
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  // Seed state from sessionStorage so a page refresh restores the session.
  const [token, setToken] = useState(() => readSession().token);
  const [user,  setUser]  = useState(() => readSession().user);

  const handleUnauthorized = useCallback(() => {
    setToken(null);
    setUser(null);
    writeSession(null, null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    writeSession(null, null);
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
    writeSession(data.token, data.user);
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
        body: isJsonBody ? JSON.stringify(body) : body === undefined ? undefined : body,
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
