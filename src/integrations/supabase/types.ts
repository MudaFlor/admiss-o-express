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
      audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      candidate_stage_history: {
        Row: {
          actor_user_id: string | null
          candidate_id: string
          created_at: string
          from_stage: Database["public"]["Enums"]["candidate_stage"] | null
          id: string
          note: string | null
          to_stage: Database["public"]["Enums"]["candidate_stage"]
        }
        Insert: {
          actor_user_id?: string | null
          candidate_id: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["candidate_stage"] | null
          id?: string
          note?: string | null
          to_stage: Database["public"]["Enums"]["candidate_stage"]
        }
        Update: {
          actor_user_id?: string | null
          candidate_id?: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["candidate_stage"] | null
          id?: string
          note?: string | null
          to_stage?: Database["public"]["Enums"]["candidate_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "candidate_stage_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          access_token: string
          cor_raca: string | null
          cpf: string | null
          created_at: string
          created_by: string
          deletion_requested_at: string | null
          email: string | null
          estado_civil: string | null
          form_data: Json
          full_name: string
          id: string
          lgpd_accepted_at: string | null
          phone: string | null
          position: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sexo: string | null
          stage: Database["public"]["Enums"]["candidate_stage"]
          stage_note: string | null
          stage_updated_at: string
          stage_updated_by: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          cor_raca?: string | null
          cpf?: string | null
          created_at?: string
          created_by: string
          deletion_requested_at?: string | null
          email?: string | null
          estado_civil?: string | null
          form_data?: Json
          full_name: string
          id?: string
          lgpd_accepted_at?: string | null
          phone?: string | null
          position?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sexo?: string | null
          stage?: Database["public"]["Enums"]["candidate_stage"]
          stage_note?: string | null
          stage_updated_at?: string
          stage_updated_by?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          token_expires_at?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          cor_raca?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string
          deletion_requested_at?: string | null
          email?: string | null
          estado_civil?: string | null
          form_data?: Json
          full_name?: string
          id?: string
          lgpd_accepted_at?: string | null
          phone?: string | null
          position?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sexo?: string | null
          stage?: Database["public"]["Enums"]["candidate_stage"]
          stage_note?: string | null
          stage_updated_at?: string
          stage_updated_by?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      dependents: {
        Row: {
          birth_date: string | null
          candidate_id: string
          cpf: string | null
          created_at: string
          full_name: string
          id: string
          relationship: string | null
          rg: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          candidate_id: string
          cpf?: string | null
          created_at?: string
          full_name: string
          id?: string
          relationship?: string | null
          rg?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          candidate_id?: string
          cpf?: string | null
          created_at?: string
          full_name?: string
          id?: string
          relationship?: string | null
          rg?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requirements: {
        Row: {
          company_id: string | null
          condition: Json
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          condition?: Json
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          condition?: Json
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          candidate_id: string
          deleted_at: string | null
          deleted_by: string | null
          dependent_id: string | null
          id: string
          label: string | null
          ocr_confidence: number | null
          ocr_data: Json | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at: string
        }
        Insert: {
          candidate_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          dependent_id?: string | null
          id?: string
          label?: string | null
          ocr_confidence?: number | null
          ocr_data?: Json | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
        }
        Update: {
          candidate_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          dependent_id?: string | null
          id?: string
          label?: string | null
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
          {
            foreignKeyName: "documents_dependent_id_fkey"
            columns: ["dependent_id"]
            isOneToOne: false
            referencedRelation: "dependents"
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
          device_info: Json | null
          geo_consent: boolean
          geolocation: Json | null
          id: string
          ip_address: string | null
          revoked_at: string | null
          signature_cpf: string | null
          signature_name: string | null
          terms_hash: string | null
          terms_text: string | null
          terms_version: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          candidate_id: string
          device_info?: Json | null
          geo_consent?: boolean
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          signature_cpf?: string | null
          signature_name?: string | null
          terms_hash?: string | null
          terms_text?: string | null
          terms_version?: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          candidate_id?: string
          device_info?: Json | null
          geo_consent?: boolean
          geolocation?: Json | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          signature_cpf?: string | null
          signature_name?: string | null
          terms_hash?: string | null
          terms_text?: string | null
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
      message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages_log: {
        Row: {
          candidate_id: string | null
          channel: string
          created_at: string
          error: string | null
          id: string
          kind: string
          payload: Json | null
          recipient: string
          sent_by: string | null
          status: string
        }
        Insert: {
          candidate_id?: string | null
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          payload?: Json | null
          recipient: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          candidate_id?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          payload?: Json | null
          recipient?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_log_candidate_id_fkey"
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
      candidate_stage:
        | "cadastro_iniciado"
        | "aceite_lgpd"
        | "curriculo_enviado"
        | "documentos_enviados"
        | "ocr_concluido"
        | "em_analise"
        | "pendencia_documental"
        | "correcao_solicitada"
        | "aguardando_aprovacao"
        | "aprovado"
        | "admitido"
      candidate_status: "pendente" | "em_analise" | "aprovado" | "rejeitado"
      document_status: "pendente" | "processado" | "aprovado" | "rejeitado"
      document_type:
        | "rg"
        | "cpf"
        | "cnh"
        | "comprovante_residencia"
        | "curriculo"
        | "ctps"
        | "titulo_eleitor"
        | "foto_3x4"
        | "certidao"
        | "reservista"
        | "pis_pasep"
        | "cartao_sus"
        | "escolaridade"
        | "certificado_curso"
        | "vacinacao_covid"
        | "dependente_certidao"
        | "dependente_rg_cpf"
        | "dependente_vacinacao"
        | "dependente_escolar"
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
      candidate_stage: [
        "cadastro_iniciado",
        "aceite_lgpd",
        "curriculo_enviado",
        "documentos_enviados",
        "ocr_concluido",
        "em_analise",
        "pendencia_documental",
        "correcao_solicitada",
        "aguardando_aprovacao",
        "aprovado",
        "admitido",
      ],
      candidate_status: ["pendente", "em_analise", "aprovado", "rejeitado"],
      document_status: ["pendente", "processado", "aprovado", "rejeitado"],
      document_type: [
        "rg",
        "cpf",
        "cnh",
        "comprovante_residencia",
        "curriculo",
        "ctps",
        "titulo_eleitor",
        "foto_3x4",
        "certidao",
        "reservista",
        "pis_pasep",
        "cartao_sus",
        "escolaridade",
        "certificado_curso",
        "vacinacao_covid",
        "dependente_certidao",
        "dependente_rg_cpf",
        "dependente_vacinacao",
        "dependente_escolar",
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
