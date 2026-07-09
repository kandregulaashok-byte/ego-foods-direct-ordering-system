import { create } from 'zustand';

export const useAppStore = create((set) => ({
  tab: 'orders',
  setTab: (tab) => set({ tab }),
  whatsappOpen: true,
  setWhatsappOpen: (whatsappOpen) => set({ whatsappOpen }),
  printerOnline: true,
  setPrinterOnline: (printerOnline) => set({ printerOnline }),
  expenseMode: null,
  openExpenseMode: (expenseMode) => set({ tab: 'expenses', expenseMode }),
  clearExpenseMode: () => set({ expenseMode: null }),
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen })
}));
