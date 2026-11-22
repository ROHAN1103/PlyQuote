import { api } from "@/lib/api";
import type { FurnitureTemplate, TemplatePayload } from "../types";

export const templatesApi = {
  list: () => api.get<FurnitureTemplate[]>("/furniture-templates"),
  create: (p: TemplatePayload) => api.post<FurnitureTemplate>("/furniture-templates", p),
  update: (id: string, p: TemplatePayload) => api.put<FurnitureTemplate>(`/furniture-templates/${id}`, p),
  remove: (id: string) => api.delete<FurnitureTemplate>(`/furniture-templates/${id}`),
};
