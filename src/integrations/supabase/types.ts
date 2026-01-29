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
      assistance_requests: {
        Row: {
          admin_notes: string | null
          assigned_at: string | null
          assigned_phone: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          location_text: string
          request_type: string
          status: string
          updated_at: string
          urgency: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_phone?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_text: string
          request_type?: string
          status?: string
          updated_at?: string
          urgency?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_phone?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string
          request_type?: string
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistance_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      expiry_notifications: {
        Row: {
          ai_content: Json | null
          created_at: string
          document_type: string
          id: string
          notification_type: string
          sent_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          ai_content?: Json | null
          created_at?: string
          document_type: string
          id?: string
          notification_type: string
          sent_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          ai_content?: Json | null
          created_at?: string
          document_type?: string
          id?: string
          notification_type?: string
          sent_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expiry_notifications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_claims: {
        Row: {
          claimant_email: string
          claimant_id: string
          claimant_phone: string | null
          created_at: string
          current_owner_id: string
          expires_at: string
          id: string
          message: string | null
          registration_number: string
          status: string
          vehicle_id: string
        }
        Insert: {
          claimant_email: string
          claimant_id: string
          claimant_phone?: string | null
          created_at?: string
          current_owner_id: string
          expires_at: string
          id?: string
          message?: string | null
          registration_number: string
          status?: string
          vehicle_id: string
        }
        Update: {
          claimant_email?: string
          claimant_id?: string
          claimant_phone?: string | null
          created_at?: string
          current_owner_id?: string
          expires_at?: string
          id?: string
          message?: string | null
          registration_number?: string
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_claims_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      parts_requests: {
        Row: {
          admin_notes: string | null
          condition_preference: string
          created_at: string
          description: string | null
          estimated_delivery: string | null
          id: string
          part_category: string
          part_name: string
          quantity: number
          quoted_price: number | null
          status: string
          updated_at: string
          urgency: string
          user_id: string
          vehicle_id: string
          vendor_info: string | null
        }
        Insert: {
          admin_notes?: string | null
          condition_preference?: string
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          part_category?: string
          part_name: string
          quantity?: number
          quoted_price?: number | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id: string
          vehicle_id: string
          vendor_info?: string | null
        }
        Update: {
          admin_notes?: string | null
          condition_preference?: string
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          part_category?: string
          part_name?: string
          quantity?: number
          quoted_price?: number | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
          vehicle_id?: string
          vendor_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          phone_number: string | null
          phone_verified: boolean | null
          preferred_language: string | null
          updated_at: string | null
          voice_reminders_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          id: string
          phone_number?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          updated_at?: string | null
          voice_reminders_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          phone_number?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          updated_at?: string | null
          voice_reminders_enabled?: boolean | null
        }
        Relationships: []
      }
      service_records: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          next_service_due_date: string | null
          next_service_due_km: number | null
          notes: string | null
          odometer_reading: number | null
          receipt_path: string | null
          service_center: string | null
          service_date: string
          service_type: string
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          next_service_due_date?: string | null
          next_service_due_km?: number | null
          notes?: string | null
          odometer_reading?: number | null
          receipt_path?: string | null
          service_center?: string | null
          service_date: string
          service_type: string
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          next_service_due_date?: string | null
          next_service_due_km?: number | null
          notes?: string | null
          odometer_reading?: number | null
          receipt_path?: string | null
          service_center?: string | null
          service_date?: string
          service_type?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_suspensions: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          suspended_at: string
          suspended_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          suspended_at?: string
          suspended_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          suspended_at?: string
          suspended_by?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_challans: {
        Row: {
          challan_date_time: string | null
          challan_no: string
          challan_place: string | null
          challan_status: string
          court_details: Json | null
          created_at: string
          department: string | null
          driver_name: string | null
          fetched_at: string
          fine_imposed: number | null
          id: string
          offence_details: Json | null
          owner_name: string | null
          raw_api_data: Json | null
          remark: string | null
          sent_to_court: boolean | null
          state_code: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          challan_date_time?: string | null
          challan_no: string
          challan_place?: string | null
          challan_status?: string
          court_details?: Json | null
          created_at?: string
          department?: string | null
          driver_name?: string | null
          fetched_at?: string
          fine_imposed?: number | null
          id?: string
          offence_details?: Json | null
          owner_name?: string | null
          raw_api_data?: Json | null
          remark?: string | null
          sent_to_court?: boolean | null
          state_code?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          challan_date_time?: string | null
          challan_no?: string
          challan_place?: string | null
          challan_status?: string
          court_details?: Json | null
          created_at?: string
          department?: string | null
          driver_name?: string | null
          fetched_at?: string
          fine_imposed?: number | null
          id?: string
          offence_details?: Json | null
          owner_name?: string | null
          raw_api_data?: Json | null
          remark?: string | null
          sent_to_court?: boolean | null
          state_code?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_challans_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_history: {
        Row: {
          created_at: string
          event_description: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          event_description: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          event_description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_listings: {
        Row: {
          additional_notes: string | null
          admin_notes: string | null
          ai_estimated_price: number | null
          created_at: string
          expected_price: number
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          additional_notes?: string | null
          admin_notes?: string | null
          ai_estimated_price?: number | null
          created_at?: string
          expected_price: number
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          additional_notes?: string | null
          admin_notes?: string | null
          ai_estimated_price?: number | null
          created_at?: string
          expected_price?: number
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_listings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_transfers: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          recipient_email: string
          recipient_id: string | null
          recipient_phone: string | null
          sender_id: string
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          recipient_email: string
          recipient_id?: string | null
          recipient_phone?: string | null
          sender_id: string
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          recipient_email?: string
          recipient_id?: string | null
          recipient_phone?: string | null
          sender_id?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_transfers_vehicle_id_fkey"
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
          is_verified: boolean | null
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
          verification_photo_path: string | null
          verified_at: string | null
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
          is_verified?: boolean | null
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
          verification_photo_path?: string | null
          verified_at?: string | null
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
          is_verified?: boolean | null
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
          verification_photo_path?: string | null
          verified_at?: string | null
          wheelbase?: string | null
        }
        Relationships: []
      }
      voice_agent_config: {
        Row: {
          agent_name: string
          bolna_agent_id: string | null
          call_terminate_seconds: number | null
          created_at: string | null
          hangup_after_silence: number | null
          id: string
          is_active: boolean | null
          language: string
          system_prompt: string
          updated_at: string | null
          voice_id: string | null
          voice_name: string | null
          voice_provider: string
          welcome_message: string
        }
        Insert: {
          agent_name?: string
          bolna_agent_id?: string | null
          call_terminate_seconds?: number | null
          created_at?: string | null
          hangup_after_silence?: number | null
          id?: string
          is_active?: boolean | null
          language?: string
          system_prompt: string
          updated_at?: string | null
          voice_id?: string | null
          voice_name?: string | null
          voice_provider?: string
          welcome_message: string
        }
        Update: {
          agent_name?: string
          bolna_agent_id?: string | null
          call_terminate_seconds?: number | null
          created_at?: string | null
          hangup_after_silence?: number | null
          id?: string
          is_active?: boolean | null
          language?: string
          system_prompt?: string
          updated_at?: string | null
          voice_id?: string | null
          voice_name?: string | null
          voice_provider?: string
          welcome_message?: string
        }
        Relationships: []
      }
      voice_call_cooldowns: {
        Row: {
          call_count: number | null
          created_at: string | null
          document_type: string
          id: string
          last_call_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          call_count?: number | null
          created_at?: string | null
          document_type: string
          id?: string
          last_call_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          call_count?: number | null
          created_at?: string | null
          document_type?: string
          id?: string
          last_call_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      voice_call_logs: {
        Row: {
          bolna_call_id: string | null
          call_type: string
          created_at: string | null
          document_type: string | null
          duration_seconds: number | null
          hangup_reason: string | null
          id: string
          language_used: string | null
          recording_url: string | null
          status: string | null
          transcript: string | null
          updated_at: string | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          bolna_call_id?: string | null
          call_type: string
          created_at?: string | null
          document_type?: string | null
          duration_seconds?: number | null
          hangup_reason?: string | null
          id?: string
          language_used?: string | null
          recording_url?: string | null
          status?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          bolna_call_id?: string | null
          call_type?: string
          created_at?: string | null
          document_type?: string | null
          duration_seconds?: number | null
          hangup_reason?: string | null
          id?: string
          language_used?: string | null
          recording_url?: string | null
          status?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_call_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_language_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          language_code: string
          language_instruction: string
          language_name: string
          system_prompt: string
          updated_at: string | null
          welcome_message: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language_code: string
          language_instruction: string
          language_name: string
          system_prompt: string
          updated_at?: string | null
          welcome_message: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language_code?: string
          language_instruction?: string
          language_name?: string
          system_prompt?: string
          updated_at?: string | null
          welcome_message?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "user"
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
      app_role: ["super_admin", "user"],
    },
  },
} as const
