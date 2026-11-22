import { api } from "@/lib/api";
import { PAGE_SIZE, type Material, type MaterialFilters, type MaterialPayload, type Page } from "../types";

export const materialsApi = {
  list(f: MaterialFilters) {
    const params = new URLSearchParams({ page: String(f.page), page_size: String(PAGE_SIZE) });
    if (f.q.trim()) params.set("q", f.q.trim());
    if (f.category) params.set("category", f.category);
    if (f.status !== "all") params.set("is_active", String(f.status === "active"));
    return api.get<Page<Material>>(`/materials?${params}`);
  },
  create: (p: MaterialPayload) => api.post<Material>("/materials", p),
  update: (id: string, p: MaterialPayload) => api.put<Material>(`/materials/${id}`, p),
  deactivate: (id: string) => api.delete<Material>(`/materials/${id}`),
};
