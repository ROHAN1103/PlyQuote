import { api } from "@/lib/api";
import {
  PAGE_SIZE, type ItemPayload, type Page, type PreviewResponse, type Quotation, type QuotationDefaults,
  type QuotationFilters, type QuotationPayload, type QuotationSummary,
} from "../types";

export const quotationsApi = {
  defaults: () => api.get<QuotationDefaults>("/quotations/defaults"),
  list(f: QuotationFilters) {
    const params = new URLSearchParams({ page: String(f.page), page_size: String(PAGE_SIZE) });
    if (f.q.trim()) params.set("q", f.q.trim());
    if (f.status) params.set("status", f.status);
    return api.get<Page<QuotationSummary>>(`/quotations?${params}`);
  },
  get: (id: string) => api.get<Quotation>(`/quotations/${id}`),
  create: (p: QuotationPayload) => api.post<Quotation>("/quotations", p),
  update: (id: string, rowVersion: number, p: QuotationPayload) => api.put<Quotation>(`/quotations/${id}`, { ...p, row_version: rowVersion }),
  remove: (id: string) => api.delete<void>(`/quotations/${id}`),
  preview: (items: ItemPayload[]) => api.post<PreviewResponse>("/calculations/preview", { items }),
};
