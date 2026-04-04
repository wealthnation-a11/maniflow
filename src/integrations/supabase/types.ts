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
      bot_configs: {
        Row: {
          bot_settings: Json
          created_at: string
          id: string
          negotiation_rules: Json
          payment_details: Json
          qa_rules: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_settings?: Json
          created_at?: string
          id?: string
          negotiation_rules?: Json
          payment_details?: Json
          qa_rules?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_settings?: Json
          created_at?: string
          id?: string
          negotiation_rules?: Json
          payment_details?: Json
          qa_rules?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          audience: string | null
          created_at: string
          id: string
          message: string
          name: string
          opened: number
          platforms: string[]
          recipients: number
          replied: number
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          id?: string
          message?: string
          name?: string
          opened?: number
          platforms?: string[]
          recipients?: number
          replied?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          id?: string
          message?: string
          name?: string
          opened?: number
          platforms?: string[]
          recipients?: number
          replied?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          customer_platform_id: string | null
          id: string
          last_message_at: string
          platform: Database["public"]["Enums"]["platform_type"]
          platform_conversation_id: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          customer_platform_id?: string | null
          id?: string
          last_message_at?: string
          platform: Database["public"]["Enums"]["platform_type"]
          platform_conversation_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          customer_platform_id?: string | null
          id?: string
          last_message_at?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_conversation_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[]
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          first_seen: string | null
          id: string
          last_order_at: string | null
          name: string
          phone: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          preferences: string[]
          status: Database["public"]["Enums"]["customer_status"]
          total_orders: number
          total_spent: number
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_seen?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          phone?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          preferences?: string[]
          status?: Database["public"]["Enums"]["customer_status"]
          total_orders?: number
          total_spent?: number
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_seen?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          phone?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          preferences?: string[]
          status?: Database["public"]["Enums"]["customer_status"]
          total_orders?: number
          total_spent?: number
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          platform_message_id: string | null
          role: Database["public"]["Enums"]["message_role"]
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          platform_message_id?: string | null
          role: Database["public"]["Enums"]["message_role"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          platform_message_id?: string | null
          role?: Database["public"]["Enums"]["message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          platform: Database["public"]["Enums"]["platform_type"]
          product_name: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          platform?: Database["public"]["Enums"]["platform_type"]
          product_name?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          platform?: Database["public"]["Enums"]["platform_type"]
          product_name?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          access_token: string
          business_account_id: string | null
          connected_at: string
          id: string
          page_id: string | null
          phone_number_id: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          updated_at: string
          user_id: string
          webhook_verify_token: string
        }
        Insert: {
          access_token: string
          business_account_id?: string | null
          connected_at?: string
          id?: string
          page_id?: string | null
          phone_number_id?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          updated_at?: string
          user_id: string
          webhook_verify_token?: string
        }
        Update: {
          access_token?: string
          business_account_id?: string | null
          connected_at?: string
          id?: string
          page_id?: string | null
          phone_number_id?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          updated_at?: string
          user_id?: string
          webhook_verify_token?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
          updated_at: string
          user_id: string
          variants: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          stock?: number
          updated_at?: string
          user_id: string
          variants?: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
          updated_at?: string
          user_id?: string
          variants?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_tone: string | null
          business_name: string
          created_at: string
          currency: string | null
          id: string
          logo_url: string | null
          payment_details: Json
          phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          ai_tone?: string | null
          business_name?: string
          created_at?: string
          currency?: string | null
          id: string
          logo_url?: string | null
          payment_details?: Json
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          ai_tone?: string | null
          business_name?: string
          created_at?: string
          currency?: string | null
          id?: string
          logo_url?: string | null
          payment_details?: Json
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      campaign_status: "draft" | "scheduled" | "sent" | "active"
      conversation_status: "active" | "closed" | "archived"
      customer_status: "active" | "inactive" | "new"
      message_role: "customer" | "ai" | "manual"
      order_status: "pending" | "processing" | "shipped" | "delivered"
      payment_status: "pending" | "paid" | "failed"
      platform_type: "whatsapp" | "instagram" | "facebook" | "tiktok"
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
      campaign_status: ["draft", "scheduled", "sent", "active"],
      conversation_status: ["active", "closed", "archived"],
      customer_status: ["active", "inactive", "new"],
      message_role: ["customer", "ai", "manual"],
      order_status: ["pending", "processing", "shipped", "delivered"],
      payment_status: ["pending", "paid", "failed"],
      platform_type: ["whatsapp", "instagram", "facebook", "tiktok"],
    },
  },
} as const
