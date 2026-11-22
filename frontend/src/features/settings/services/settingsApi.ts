import { api } from "@/lib/api";
import type { Company, CompanyPayload } from "../types";

export const settingsApi = {
  get: () => api.get<Company>("/settings/company"),
  update: (p: CompanyPayload) => api.put<Company>("/settings/company", p),
  uploadLogo(file: File) {
    const form = new FormData();
    form.append("file", file);
    return api.upload<Company>("/settings/company/logo", form);
  },
  deleteLogo: () => api.delete<Company>("/settings/company/logo"),
};
export const logoUrl = (version: string | null) => `/api/v1/settings/company/logo?v=${version ?? ""}`;
