export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_license: {
        Row: {
          created_at: string
          expire_date: string | null
          id: string
          is_active: boolean | null
          license_key: string
          license_type: string | null
        }
        Insert: {
          created_at?: string
          expire_date?: string | null
          id?: string
          is_active?: boolean | null
          license_key: string
          license_type?: string | null
        }
        Update: {
          created_at?: string
          expire_date?: string | null
          id?: string
          is_active?: boolean | null
          license_key?: string
          license_type?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          barcode: string | null
          buy_price: number | null
          category_id: string | null
          code: string | null
          created_at: string
          discount_pct: number | null
          id: string
          is_active: boolean | null
          min_stock: number | null
          name: string
          sell_price: number | null
          sell_price_lv2: number | null
          sell_price_lv3: number | null
          stock: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          buy_price?: number | null
          category_id?: string | null
          code?: string | null
          created_at?: string
          discount_pct?: number | null
          id?: string
          is_active?: boolean | null
          min_stock?: number | null
          name: string
          sell_price?: number | null
          sell_price_lv2?: number | null
          sell_price_lv3?: number | null
          stock?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          buy_price?: number | null
          category_id?: string | null
          code?: string | null
          created_at?: string
          discount_pct?: number | null
          id?: string
          is_active?: boolean | null
          min_stock?: number | null
          name?: string
          sell_price?: number | null
          sell_price_lv2?: number | null
          sell_price_lv3?: number | null
          stock?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          price: number
          purchase_id: string
          qty: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          price: number
          purchase_id: string
          qty: number
          subtotal: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          price?: number
          purchase_id?: string
          qty?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          invoice_no: string
          notes: string | null
          status: string | null
          supplier_id: string | null
          total: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          invoice_no: string
          notes?: string | null
          status?: string | null
          supplier_id?: string | null
          total?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          invoice_no?: string
          notes?: string | null
          status?: string | null
          supplier_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          price: number
          qty: number
          return_id: string
          subtotal: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          price: number
          qty: number
          return_id: string
          subtotal: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          price?: number
          qty?: number
          return_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          return_no: string
          sale_id: string | null
          total: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          return_no: string
          sale_id?: string | null
          total?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          return_no?: string
          sale_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount_pct: number | null
          id: string
          item_id: string
          price: number
          qty: number
          sale_id: string
          subtotal: number
        }
        Insert: {
          created_at?: string
          discount_pct?: number | null
          id?: string
          item_id: string
          price: number
          qty: number
          sale_id: string
          subtotal: number
        }
        Update: {
          created_at?: string
          discount_pct?: number | null
          id?: string
          item_id?: string
          price?: number
          qty?: number
          sale_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string | null
          change_amount: number | null
          created_at: string
          customer_name: string | null
          date: string
          discount: number | null
          grand_total: number | null
          id: string
          invoice_no: string
          notes: string | null
          paid_amount: number | null
          payment_method: string | null
          price_level: number | null
          subtotal: number | null
          tax: number | null
        }
        Insert: {
          cashier_id?: string | null
          change_amount?: number | null
          created_at?: string
          customer_name?: string | null
          date?: string
          discount?: number | null
          grand_total?: number | null
          id?: string
          invoice_no: string
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          price_level?: number | null
          subtotal?: number | null
          tax?: number | null
        }
        Update: {
          cashier_id?: string | null
          change_amount?: number | null
          created_at?: string
          customer_name?: string | null
          date?: string
          discount?: number | null
          grand_total?: number | null
          id?: string
          invoice_no?: string
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          price_level?: number | null
          subtotal?: number | null
          tax?: number | null
        }
        Relationships: []
      }
      stock_moves: {
        Row: {
          created_at: string
          id: string
          item_id: string
          notes: string | null
          qty: number
          reference_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          qty: number
          reference_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          qty?: number
          reference_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_moves_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_no: { Args: { prefix: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "kasir"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "kasir"],
    },
  },
} as const
