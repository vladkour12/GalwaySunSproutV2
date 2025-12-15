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
    // In local dev, suppress network errors to console if API routes aren't available
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalDev && String(input).includes('/api/')) {
      // Don't log expected 404s in local dev
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
    // Check if response is HTML (likely a 404 page or error page)
    if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
      const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isLocalDev && url.includes('/api/')) {
        throw new ApiError('API routes not available in local development. Use "npm run dev:vercel" or deploy to Vercel.', { status: res.status, url });
      }
      throw new ApiError(`API returned HTML instead of JSON. Route may not exist or server misconfigured.`, { status: res.status, url });
    }
    
    // Try to parse error as JSON
    let errorMessage = `Request failed (${res.status})`;
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorMessage;
    } catch {
      if (text && text.length < 200) {
        errorMessage = `${errorMessage}: ${text}`;
      }
    }
    throw new ApiError(errorMessage, { status: res.status, url });
  }

  try {
    return JSON.parse(text) as T;
  } catch (parseError) {
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const trimmed = text.trim();
    
    // Check if response is TypeScript/JavaScript source code (Vite serves .ts files as-is)
    if (trimmed.startsWith('import ') || trimmed.startsWith('export ') || trimmed.startsWith('//')) {
      if (isLocalDev && url.includes('/api/')) {
        throw new ApiError('API routes require "npm run dev:vercel" instead of "npm run dev". Vite cannot run serverless functions.', { status: res.status, url });
      }
      throw new ApiError('API endpoint returned source code instead of JSON. This usually means the serverless function is not configured correctly.', { status: res.status, url });
    }
    
    // Check if response is HTML (commonly happens when host serves index.html for /api/*)
    if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) {
      if (isLocalDev && url.includes('/api/')) {
        throw new ApiError('API routes not available in local development. Use "npm run dev:vercel" instead of "npm run dev".', { status: res.status, url });
      }
      throw new ApiError('API returned HTML instead of JSON. This usually means API routes are not configured correctly.', { status: res.status, url });
    }
    // This commonly happens when the host serves index.html for /api/* (misconfigured rewrites)
    throw new ApiError(`Invalid JSON response from API: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`, { status: res.status, url });
  }
};

const fetchOk = async (url: string, init?: RequestInit) => {
  const res = await fetchWithTimeout(url, init);
  if (!res.ok) {
    const text = await res.text();
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const trimmed = text.trim();
    
    // Check if response is TypeScript/JavaScript source code (Vite serves .ts files as-is on 404)
    if (trimmed.startsWith('import ') || trimmed.startsWith('export ') || trimmed.startsWith('//')) {
      if (isLocalDev && url.includes('/api/')) {
        throw new ApiError('API routes require "npm run dev:vercel" instead of "npm run dev". Vite cannot run serverless functions.', { status: res.status, url });
      }
      throw new ApiError('API endpoint returned source code instead of JSON. This usually means the serverless function is not configured correctly.', { status: res.status, url });
    }
    
    // Check if response is HTML (likely a 404 page or error page)
    if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) {
      if (isLocalDev && url.includes('/api/')) {
        throw new ApiError('API routes not available in local development. Use "npm run dev:vercel" instead of "npm run dev".', { status: res.status, url });
      }
      throw new ApiError(`API returned HTML instead of JSON. Route may not exist.`, { status: res.status, url });
    }
    
    let errorMessage = `Request failed (${res.status})`;
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If response is not JSON, include the text if it's short
      if (text && text.length < 200) {
        errorMessage = `${errorMessage}: ${text}`;
      }
    }
    throw new ApiError(errorMessage, { status: res.status, url });
  }
  return res;
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
     const res = await fetchWithTimeout('/api/setup', { method: 'GET' });
     if (!res.ok) {
       const text = await res.text();
       // Check if response is HTML (likely a 404 page)
       if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
         throw new ApiError('API routes not available. Are you running on Vercel or using vercel dev?', { status: res.status, url: '/api/setup' });
       }
       let errorMessage = `Database setup failed (${res.status})`;
       try {
         const errorData = JSON.parse(text);
         errorMessage = errorData.error || errorMessage;
       } catch {
         if (text && text.length < 200) {
           errorMessage = `${errorMessage}: ${text}`;
         }
       }
       throw new ApiError(errorMessage, { status: res.status, url: '/api/setup' });
     }
     // Verify it returns valid JSON
     const text = await res.text();
     try {
       JSON.parse(text);
     } catch {
       // If setup doesn't return valid JSON, check if it's HTML
       if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
         throw new ApiError('API routes not available. Received HTML instead of JSON.', { status: res.status, url: '/api/setup' });
       }
     }
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
