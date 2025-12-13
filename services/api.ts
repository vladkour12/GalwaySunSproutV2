import { CropType, Tray, Transaction, Customer } from '../types';

const headers = { 'Content-Type': 'application/json' };

export const api = {
  // --- Crops ---
  async getCrops(): Promise<CropType[]> {
    const res = await fetch('/api/crops');
    if (!res.ok) throw new Error('Failed to fetch crops');
    return res.json();
  },
  async saveCrop(crop: CropType) {
    const res = await fetch('/api/crops', { method: 'POST', headers, body: JSON.stringify(crop) });
    if (!res.ok) throw new Error('Failed to save crop');
  },
  async deleteCrop(id: string) {
    const res = await fetch(`/api/crops?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete crop');
  },

  // --- Trays ---
  async getTrays(): Promise<Tray[]> {
    const res = await fetch('/api/trays');
    if (!res.ok) throw new Error('Failed to fetch trays');
    return res.json();
  },
  async saveTray(tray: Tray) {
    const res = await fetch('/api/trays', { method: 'POST', headers, body: JSON.stringify(tray) });
    if (!res.ok) throw new Error('Failed to save tray');
  },
  async deleteTray(id: string) {
    const res = await fetch(`/api/trays?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete tray');
  },

  // --- Transactions ---
  async getTransactions(): Promise<Transaction[]> {
    const res = await fetch('/api/transactions');
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },
  async saveTransaction(txn: Transaction) {
    const res = await fetch('/api/transactions', { method: 'POST', headers, body: JSON.stringify(txn) });
    if (!res.ok) throw new Error('Failed to save transaction');
  },
  async deleteTransaction(id: string) {
    const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete transaction');
  },

  // --- Customers ---
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch('/api/customers');
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },
  async saveCustomer(cust: Customer) {
    const res = await fetch('/api/customers', { method: 'POST', headers, body: JSON.stringify(cust) });
    if (!res.ok) throw new Error('Failed to save customer');
  },
  async deleteCustomer(id: string) {
    const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete customer');
  },

  // --- System ---
  async setup() {
     const res = await fetch('/api/setup');
     if (!res.ok) throw new Error('Failed to setup DB');
  },
  async seed(data: { crops: CropType[], customers: Customer[] }) {
     const res = await fetch('/api/seed', { method: 'POST', headers, body: JSON.stringify(data) });
     if (!res.ok) throw new Error('Failed to seed DB');
  }
};
