// Database abstraction layer - FORCE OFFLINE MODE for client distribution
// Always uses Electron SQLite - no Supabase connection

// FORCE OFFLINE MODE - Always true for client distribution
const isElectron = true;

// Type for Electron API
interface ElectronAPI {
  isElectron: boolean;
  db: {
    select: (table: string, where?: any, orderBy?: string) => Promise<{ data?: any[]; error?: { message: string } }>;
    selectOne: (table: string, where: any) => Promise<{ data?: any; error?: { message: string } }>;
    insert: (table: string, data: any) => Promise<{ data?: any; error?: { message: string } }>;
    update: (table: string, data: any, where: any) => Promise<{ data?: any; error?: { message: string } }>;
    delete: (table: string, where: any) => Promise<{ data?: any; error?: { message: string } }>;
    query: (sql: string, params?: any[]) => Promise<{ data?: any[]; error?: { message: string } }>;
    run: (sql: string, params?: any[]) => Promise<{ data?: any; error?: { message: string } }>;
  };
}

const getElectronAPI = (): ElectronAPI | null => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI as ElectronAPI;
  }
  return null;
};

// Generic database operations - OFFLINE ONLY
export const db = {
  // Select all records from a table
  async select<T>(
    table: string,
    options?: {
      where?: Record<string, any>;
      orderBy?: string;
      orderAsc?: boolean;
      select?: string;
    }
  ): Promise<{ data: T[] | null; error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (!electronAPI) {
      return { data: null, error: new Error('Aplikasi hanya berjalan di mode offline (Electron)') };
    }

    const result = await electronAPI.db.select(table, options?.where, options?.orderBy);
    if (result.error) {
      return { data: null, error: new Error(result.error.message) };
    }
    return { data: result.data as T[], error: null };
  },

  // Select single record
  async selectOne<T>(
    table: string,
    where: Record<string, any>
  ): Promise<{ data: T | null; error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (!electronAPI) {
      return { data: null, error: new Error('Aplikasi hanya berjalan di mode offline (Electron)') };
    }

    const result = await electronAPI.db.selectOne(table, where);
    if (result.error) {
      return { data: null, error: new Error(result.error.message) };
    }
    return { data: result.data as T, error: null };
  },

  // Insert record
  async insert<T>(
    table: string,
    data: Partial<T>
  ): Promise<{ data: T | null; error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (!electronAPI) {
      return { data: null, error: new Error('Aplikasi hanya berjalan di mode offline (Electron)') };
    }

    const result = await electronAPI.db.insert(table, data);
    if (result.error) {
      return { data: null, error: new Error(result.error.message) };
    }
    return { data: result.data as T, error: null };
  },

  // Update record
  async update<T>(
    table: string,
    data: Partial<T>,
    where: Record<string, any>
  ): Promise<{ data: T | null; error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (!electronAPI) {
      return { data: null, error: new Error('Aplikasi hanya berjalan di mode offline (Electron)') };
    }

    const result = await electronAPI.db.update(table, data, where);
    if (result.error) {
      return { data: null, error: new Error(result.error.message) };
    }
    return { data: result.data as T, error: null };
  },

  // Delete record
  async delete(
    table: string,
    where: Record<string, any>
  ): Promise<{ error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (!electronAPI) {
      return { error: new Error('Aplikasi hanya berjalan di mode offline (Electron)') };
    }

    const result = await electronAPI.db.delete(table, where);
    if (result.error) {
      return { error: new Error(result.error.message) };
    }
    return { error: null };
  },

  // Custom query (SQLite only)
  async query<T>(sql: string, params?: any[]): Promise<{ data: T[] | null; error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (!electronAPI) {
      return { data: null, error: new Error('Aplikasi hanya berjalan di mode offline (Electron)') };
    }

    const result = await electronAPI.db.query(sql, params);
    if (result.error) {
      return { data: null, error: new Error(result.error.message) };
    }
    return { data: result.data as T[], error: null };
  },

  // Always offline mode
  isOffline(): boolean {
    return true;
  }
};

export { isElectron };
