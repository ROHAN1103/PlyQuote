import { create } from "zustand";

type AppState = {
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  mobileNavOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
}));
