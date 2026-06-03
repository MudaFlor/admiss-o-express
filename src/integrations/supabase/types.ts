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
      absences: {
        Row: {
          created_at: string
          created_by: string
          employee_id: string
          end_date: string
          hours_lost: number
          id: string
          notes: string | null
          reason: Database["public"]["Enums"]["absence_reason"]
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          employee_id: string
          end_date: string
          hours_lost?: number
          id?: string
          notes?: string | null
          reason: Database["public"]["Enums"]["absence_reason"]
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          employee_id?: string
          end_date?: string
          hours_lost?: number
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["absence_reason"]
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          access_token: string
          cpf: string | null
          created_at: string
          created_by: string
          deletion_requested_at: string | null
          email: string | null
          form_data: Json
          full_name: string
          id: string
          lgpd_accepted_at: string | null
          phone: string | null
          position: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          cpf?: string | null
          created_at?: string
          created_by: string
          deletion_requested_at?: string | null
          email?: string | null
          form_data?: Json
          full_name: string
          id?: string
          lgpd_accepted_at?: string | null
          phone?: string | null
          position?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          token_expires_at?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          cpf?: string | null
          created_at?: string
          created_by?: string
          deletion_requested_at?: string | null
          email?: string | null
          form_data?: Json
          full_name?: string
          id?: string
          lgpd_accepted_at?: string | null
          phone?: string | null
          position?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          candidate_id: string
          id: string
          ocr_confidence: number | null
          ocr_data: Json | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at: string
        }
        Insert: {
          candidate_id: string
          id?: string
          ocr_confidence?: number | null
          ocr_data?: Json | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
        }
        Update: {
          candidate_id?: string
          id?: string
          ocr_confidence?: number | null
          ocr_data?: Json | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          admission_date: string
          candidate_id: string | null
          created_at: string
          created_by: string
          department: string | null
          full_name: string
          id: string
          position: string | null
          termination_date: string | null
          termination_reason:
            | Database["public"]["Enums"]["termination_reason"]
            | null
          updated_at: string
        }
        Insert: {
          admission_date: string
          candidate_id?: string | null
          created_at?: string
          created_by: string
          department?: string | null
          full_name: string
          id?: string
          position?: string | null
          termination_date?: string | null
          termination_reason?:
            | Database["public"]["Enums"]["termination_reason"]
            | null
          updated_at?: string
        }
        Update: {
          admission_date?: string
          candidate_id?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          full_name?: string
          id?: string
          position?: string | null
          termination_date?: string | null
          termination_reason?:
            | Database["public"]["Enums"]["termination_reason"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_consents: {
        Row: {
          accepted_at: string
          candidate_id: string
          id: string
          ip_address: string | null
          terms_version: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          candidate_id: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          candidate_id?: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lgpd_consents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          candidate_id: string | null
          created_at: string
          event: string
          id: string
          payload: Json | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          event: string
          id?: string
          payload?: Json | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          event?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      absence_reason:
        | "atestado"
        | "falta_justificada"
        | "falta_injustificada"
        | "licenca"
      app_role: "admin" | "rh"
      candidate_status: "pendente" | "em_analise" | "aprovado" | "rejeitado"
      document_status: "pendente" | "processado" | "aprovado" | "rejeitado"
      document_type:
        | "rg"
        | "cpf"
        | "cnh"
        | "comprovante_residencia"
        | "curriculo"
      termination_reason:
        | "pedido_demissao"
        | "sem_justa_causa"
        | "justa_causa"
        | "fim_experiencia"
        | "acordo"
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
      absence_reason: [
        "atestado",
        "falta_justificada",
        "falta_injustificada",
        "licenca",
      ],
      app_role: ["admin", "rh"],
      candidate_status: ["pendente", "em_analise", "aprovado", "rejeitado"],
      document_status: ["pendente", "processado", "aprovado", "rejeitado"],
      document_type: [
        "rg",
        "cpf",
        "cnh",
        "comprovante_residencia",
        "curriculo",
      ],
      termination_reason: [
        "pedido_demissao",
        "sem_justa_causa",
        "justa_causa",
        "fim_experiencia",
        "acordo",
      ],
    },
  },
} as const
