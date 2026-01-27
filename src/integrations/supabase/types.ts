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
      documents: {
        Row: {
          document_name: string
          document_type: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          document_name: string
          document_type: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          document_name?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          body_type: string | null
          chassis_number: string | null
          color: string | null
          created_at: string
          cubic_capacity: number | null
          data_last_fetched_at: string | null
          emission_norms: string | null
          engine_number: string | null
          financer: string | null
          fitness_valid_upto: string | null
          fuel_type: string | null
          gross_vehicle_weight: string | null
          id: string
          insurance_company: string | null
          insurance_expiry: string | null
          is_financed: boolean | null
          maker_model: string | null
          manufacturer: string | null
          noc_details: string | null
          owner_count: number | null
          owner_name: string | null
          pucc_valid_upto: string | null
          raw_api_data: Json | null
          rc_status: string | null
          registration_date: string | null
          registration_number: string
          road_tax_valid_upto: string | null
          seating_capacity: number | null
          unladen_weight: string | null
          updated_at: string
          user_id: string
          vehicle_category: string | null
          vehicle_class: string | null
          wheelbase: string | null
        }
        Insert: {
          body_type?: string | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string
          cubic_capacity?: number | null
          data_last_fetched_at?: string | null
          emission_norms?: string | null
          engine_number?: string | null
          financer?: string | null
          fitness_valid_upto?: string | null
          fuel_type?: string | null
          gross_vehicle_weight?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          is_financed?: boolean | null
          maker_model?: string | null
          manufacturer?: string | null
          noc_details?: string | null
          owner_count?: number | null
          owner_name?: string | null
          pucc_valid_upto?: string | null
          raw_api_data?: Json | null
          rc_status?: string | null
          registration_date?: string | null
          registration_number: string
          road_tax_valid_upto?: string | null
          seating_capacity?: number | null
          unladen_weight?: string | null
          updated_at?: string
          user_id: string
          vehicle_category?: string | null
          vehicle_class?: string | null
          wheelbase?: string | null
        }
        Update: {
          body_type?: string | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string
          cubic_capacity?: number | null
          data_last_fetched_at?: string | null
          emission_norms?: string | null
          engine_number?: string | null
          financer?: string | null
          fitness_valid_upto?: string | null
          fuel_type?: string | null
          gross_vehicle_weight?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          is_financed?: boolean | null
          maker_model?: string | null
          manufacturer?: string | null
          noc_details?: string | null
          owner_count?: number | null
          owner_name?: string | null
          pucc_valid_upto?: string | null
          raw_api_data?: Json | null
          rc_status?: string | null
          registration_date?: string | null
          registration_number?: string
          road_tax_valid_upto?: string | null
          seating_capacity?: number | null
          unladen_weight?: string | null
          updated_at?: string
          user_id?: string
          vehicle_category?: string | null
          vehicle_class?: string | null
          wheelbase?: string | null
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
