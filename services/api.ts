import { CropType, Tray, Transaction, Customer } from '../types';

const headers = { 'Content-Type': 'application/json' };

const DEFAULT_TIMEOUT_MS = 15_000;

class ApiError extends Error {
  readonly status?: number;
  readonly url?: string;

  constructor(message: string, opts?: { status?: number; url?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.url = opts?.url;
  }
}

const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    // AbortController isn't perfectly reliable in all environments, so we also race.
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new ApiError(`Request timed out after ${timeoutMs}ms`, { url: String(input) }));
      }, timeoutMs);
    });

    return (await Promise.race([fetch(input, { ...init, signal: controller.signal }), timeoutPromise])) as Response;
  } catch (err) {
    if ((err as any)?.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeoutMs}ms`, { url: String(input) });
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetchWithTimeout(url, init);
  const text = await res.text();

  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, { status: res.status, url });
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    // This commonly happens when the host serves index.html for /api/* (misconfigured rewrites)
    throw new ApiError(`Invalid JSON response from API`, { status: res.status, url });
  }
};

const fetchOk = async (url: string, init?: RequestInit) => {
  const res = await fetchWithTimeout(url, init);
  if (!res.ok) throw new ApiError(`Request failed (${res.status})`, { status: res.status, url });
};

export const api = {
  // --- Crops ---
  async getCrops(): Promise<CropType[]> {
    return fetchJson<CropType[]>('/api/crops');
  },
  async saveCrop(crop: CropType) {
    await fetchOk('/api/crops', { method: 'POST', headers, body: JSON.stringify(crop) });
  },
  async deleteCrop(id: string) {
    await fetchOk(`/api/crops?id=${id}`, { method: 'DELETE' });
  },

  // --- Trays ---
  async getTrays(): Promise<Tray[]> {
    return fetchJson<Tray[]>('/api/trays');
  },
  async saveTray(tray: Tray) {
    await fetchOk('/api/trays', { method: 'POST', headers, body: JSON.stringify(tray) });
  },
  async deleteTray(id: string) {
    await fetchOk(`/api/trays?id=${id}`, { method: 'DELETE' });
  },

  // --- Transactions ---
  async getTransactions(): Promise<Transaction[]> {
    return fetchJson<Transaction[]>('/api/transactions');
  },
  async saveTransaction(txn: Transaction) {
    await fetchOk('/api/transactions', { method: 'POST', headers, body: JSON.stringify(txn) });
  },
  async deleteTransaction(id: string) {
    await fetchOk(`/api/transactions?id=${id}`, { method: 'DELETE' });
  },

  // --- Customers ---
  async getCustomers(): Promise<Customer[]> {
    return fetchJson<Customer[]>('/api/customers');
  },
  async saveCustomer(cust: Customer) {
    await fetchOk('/api/customers', { method: 'POST', headers, body: JSON.stringify(cust) });
  },
  async deleteCustomer(id: string) {
    await fetchOk(`/api/customers?id=${id}`, { method: 'DELETE' });
  },

  // --- System ---
  async setup() {
     await fetchOk('/api/setup');
  },
  async seed(data: { crops: CropType[], customers: Customer[] }) {
     const res = await fetchWithTimeout('/api/seed', { method: 'POST', headers, body: JSON.stringify(data) });
     const text = await res.text();
     
     if (!res.ok) {
       try {
         const errorData = JSON.parse(text);
         throw new ApiError(errorData.error || `Seed failed (${res.status})`, { status: res.status, url: '/api/seed' });
       } catch {
         throw new ApiError(`Seed failed (${res.status}): ${text}`, { status: res.status, url: '/api/seed' });
       }
     }
     
     try {
       return JSON.parse(text);
     } catch {
       return { message: 'Seeded successfully' };
     }
  }
};
