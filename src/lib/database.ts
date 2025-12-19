// Database abstraction layer - works with both Electron SQLite and Supabase
// Detects environment and uses appropriate backend

import { supabase } from "@/integrations/supabase/client";

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron;

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
  if (isElectron) {
    return (window as any).electronAPI as ElectronAPI;
  }
  return null;
};

// Generic database operations
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
    
    if (electronAPI) {
      // Electron/SQLite mode
      const result = await electronAPI.db.select(table, options?.where, options?.orderBy);
      if (result.error) {
        return { data: null, error: new Error(result.error.message) };
      }
      return { data: result.data as T[], error: null };
    } else {
      // Supabase mode
      let query = supabase.from(table as any).select(options?.select || '*');
      
      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options?.orderAsc ?? true });
      }
      
      const { data, error } = await query;
      return { data: data as T[], error };
    }
  },

  // Select single record
  async selectOne<T>(
    table: string,
    where: Record<string, any>
  ): Promise<{ data: T | null; error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (electronAPI) {
      const result = await electronAPI.db.selectOne(table, where);
      if (result.error) {
        return { data: null, error: new Error(result.error.message) };
      }
      return { data: result.data as T, error: null };
    } else {
      let query = supabase.from(table as any).select('*');
      
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query.single();
      return { data: data as T, error };
    }
  },

  // Insert record
  async insert<T>(
    table: string,
    data: Partial<T>
  ): Promise<{ data: T | null; error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (electronAPI) {
      const result = await electronAPI.db.insert(table, data);
      if (result.error) {
        return { data: null, error: new Error(result.error.message) };
      }
      return { data: result.data as T, error: null };
    } else {
      const { data: result, error } = await supabase
        .from(table as any)
        .insert(data as any)
        .select()
        .single();
      return { data: result as T, error };
    }
  },

  // Update record
  async update<T>(
    table: string,
    data: Partial<T>,
    where: Record<string, any>
  ): Promise<{ data: T | null; error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (electronAPI) {
      const result = await electronAPI.db.update(table, data, where);
      if (result.error) {
        return { data: null, error: new Error(result.error.message) };
      }
      return { data: result.data as T, error: null };
    } else {
      let query = supabase.from(table as any).update(data as any);
      
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data: result, error } = await query.select().single();
      return { data: result as T, error };
    }
  },

  // Delete record
  async delete(
    table: string,
    where: Record<string, any>
  ): Promise<{ error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (electronAPI) {
      const result = await electronAPI.db.delete(table, where);
      if (result.error) {
        return { error: new Error(result.error.message) };
      }
      return { error: null };
    } else {
      let query = supabase.from(table as any).delete();
      
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { error } = await query;
      return { error };
    }
  },

  // Custom query (Electron only - falls back to select for Supabase)
  async query<T>(sql: string, params?: any[]): Promise<{ data: T[] | null; error: Error | null }> {
    const electronAPI = getElectronAPI();
    
    if (electronAPI) {
      const result = await electronAPI.db.query(sql, params);
      if (result.error) {
        return { data: null, error: new Error(result.error.message) };
      }
      return { data: result.data as T[], error: null };
    } else {
      // Custom SQL not supported in Supabase from frontend
      return { data: null, error: new Error('Custom SQL queries are not supported in web mode') };
    }
  },

  // Check if running in offline mode
  isOffline(): boolean {
    return isElectron;
  }
};

export { isElectron };
