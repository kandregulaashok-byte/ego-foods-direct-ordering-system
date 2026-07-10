import { create } from 'zustand';
import { readLocal, writeLocal } from '../lib/localPersist';

const printerSettings = readLocal('kitchen-printer-settings', { customerPrinterName: 'POS-58-Series' });

export const useAppStore = create((set) => ({
  tab: 'orders',
  setTab: (tab) => set({ tab }),
  whatsappOpen: true,
  setWhatsappOpen: (whatsappOpen) => set({ whatsappOpen }),
  printerOnline: true,
  setPrinterOnline: (printerOnline) => set({ printerOnline }),
  customerPrinterName: printerSettings.customerPrinterName || 'POS-58-Series',
  setCustomerPrinterName: (customerPrinterName) => {
    writeLocal('kitchen-printer-settings', { customerPrinterName });
    set({ customerPrinterName });
  },
  expenseMode: null,
  openExpenseMode: (expenseMode) => set({ tab: 'expenses', expenseMode }),
  clearExpenseMode: () => set({ expenseMode: null }),
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen })
}));
