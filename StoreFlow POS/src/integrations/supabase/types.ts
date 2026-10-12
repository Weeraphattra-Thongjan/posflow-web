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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_admins: {
        Row: {
          created_at: string
          is_super: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          is_super?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          is_super?: boolean
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          store_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          store_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost: number
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number
          name: string
          price: number
          sku: string | null
          stock: number
          store_id: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          price?: number
          sku?: string | null
          stock?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          sku?: string | null
          stock?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          code: string | null
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          min_purchase: number
          name: string
          starts_at: string | null
          store_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_purchase?: number
          name: string
          starts_at?: string | null
          store_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_purchase?: number
          name?: string
          starts_at?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          store_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          store_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          product_id?: string
          product_name?: string
          quantity?: number
          sale_id?: string
          store_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string
          created_at: string
          discount: number
          id: string
          note: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          promotion_id: string | null
          receipt_no: number
          store_id: string
          subtotal: number
          total: number
        }
        Insert: {
          cashier_id: string
          created_at?: string
          discount?: number
          id?: string
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          promotion_id?: string | null
          receipt_no: number
          store_id: string
          subtotal?: number
          total?: number
        }
        Update: {
          cashier_id?: string
          created_at?: string
          discount?: number
          id?: string
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          promotion_id?: string | null
          receipt_no?: number
          store_id?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["invite_status"]
          store_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          store_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_custom_menu_entries: {
        Row: {
          created_at: string
          id: string
          link: string | null
          menu_item_id: string
          sort_order: number
          store_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          menu_item_id: string
          sort_order?: number
          store_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          menu_item_id?: string
          sort_order?: number
          store_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_custom_menu_entries_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "store_custom_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_custom_menu_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_custom_menu_items: {
        Row: {
          content: string | null
          created_at: string
          icon: string
          id: string
          label: string
          link: string | null
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          icon?: string
          id?: string
          label: string
          link?: string | null
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          icon?: string
          id?: string
          label?: string
          link?: string | null
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_custom_menu_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_menu_settings: {
        Row: {
          hidden_keys: string[]
          store_id: string
          updated_at: string
        }
        Insert: {
          hidden_keys?: string[]
          store_id: string
          updated_at?: string
        }
        Update: {
          hidden_keys?: string[]
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          slug: string
          status: Database["public"]["Enums"]["store_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          slug: string
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["ticket_status"]
          store_id: string | null
          subject: string
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["ticket_status"]
          store_id?: string | null
          subject: string
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          store_id?: string | null
          subject?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_by_email: { Args: { _email: string }; Returns: string }
      admin_list: {
        Args: never
        Returns: {
          created_at: string
          email: string
          is_super: boolean
          user_id: string
        }[]
      }
      admin_remove_by_email: { Args: { _email: string }; Returns: undefined }
      is_app_admin: { Args: { _user_id: string }; Returns: boolean }
      is_store_member: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      is_store_owner: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      seed_demo_data: {
        Args: { _owner_id: string; _store_id: string }
        Returns: undefined
      }
    }
    Enums: {
      discount_type: "percent" | "amount"
      invite_status: "pending" | "accepted" | "revoked"
      member_role: "owner" | "cashier"
      payment_method: "cash" | "qr" | "card" | "transfer"
      store_status: "active" | "suspended" | "pending"
      ticket_status: "open" | "in_progress" | "closed"
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
      discount_type: ["percent", "amount"],
      invite_status: ["pending", "accepted", "revoked"],
      member_role: ["owner", "cashier"],
      payment_method: ["cash", "qr", "card", "transfer"],
      store_status: ["active", "suspended", "pending"],
      ticket_status: ["open", "in_progress", "closed"],
    },
  },
} as const
