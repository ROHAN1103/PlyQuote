import { create } from "zustand";

/**
 * UI-only state for the quotation builder. The form's data lives in React Hook Form (the single source
 * of truth for what the user has typed); this store only remembers which item is open.
 */
type BuilderUiState = {
  expandedKey: string | null;
  setExpanded: (key: string | null) => void;
  /** Ask the item list to open the item at this index (e.g. when the server rejects it). */
  openRequest: number | null;
  requestOpen: (index: number | null) => void;
};

export const useBuilderUi = create<BuilderUiState>((set) => ({
  expandedKey: null,
  setExpanded: (key) => set({ expandedKey: key }),
  openRequest: null,
  requestOpen: (index) => set({ openRequest: index }),
}));
