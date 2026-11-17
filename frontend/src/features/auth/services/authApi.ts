import { ApiError, api } from "@/lib/api";
import type { CurrentUser } from "../types";
import type { LoginValues } from "../schemas/loginSchema";

export const authApi = {
  /** Returns null when signed out, so "logged out" is data rather than an error. */
  async me(): Promise<CurrentUser | null> {
    try {
      return await api.get<CurrentUser>("/auth/me");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  login: (values: LoginValues) => api.post<CurrentUser>("/auth/login", values),
  logout: () => api.post<{ message: string }>("/auth/logout"),
};
