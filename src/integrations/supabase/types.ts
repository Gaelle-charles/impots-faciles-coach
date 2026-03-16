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
      contenus: {
        Row: {
          contenu: string | null
          created_at: string
          id: string
          image_url: string | null
          module_id: string
          ordre: number
          texte_2: string | null
          titre: string
          type_contenu: string | null
        }
        Insert: {
          contenu?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          module_id: string
          ordre?: number
          texte_2?: string | null
          titre: string
          type_contenu?: string | null
        }
        Update: {
          contenu?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          module_id?: string
          ordre?: number
          texte_2?: string | null
          titre?: string
          type_contenu?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contenus_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      metiers: {
        Row: {
          created_at: string
          id: string
          nom: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          accessibilite: string[]
          created_at: string
          id: string
          module_slug: string
          order: number
          text_resultat_expert: string | null
          text_resultat_faible: string | null
          text_resultat_moyen: string | null
          titre: string
          total_step: number
        }
        Insert: {
          accessibilite?: string[]
          created_at?: string
          id?: string
          module_slug: string
          order?: number
          text_resultat_expert?: string | null
          text_resultat_faible?: string | null
          text_resultat_moyen?: string | null
          titre: string
          total_step?: number
        }
        Update: {
          accessibilite?: string[]
          created_at?: string
          id?: string
          module_slug?: string
          order?: number
          text_resultat_expert?: string | null
          text_resultat_faible?: string | null
          text_resultat_moyen?: string | null
          titre?: string
          total_step?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          date_paiement: string | null
          email: string | null
          id: string
          is_active: boolean
          metier_id: string | null
          nom: string | null
          plan: string
          prenom: string | null
          role: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          metier_id?: string | null
          nom?: string | null
          plan?: string
          prenom?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          metier_id?: string | null
          nom?: string | null
          plan?: string
          prenom?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_metier_id_fkey"
            columns: ["metier_id"]
            isOneToOne: false
            referencedRelation: "metiers"
            referencedColumns: ["id"]
          },
        ]
      }
      progressions: {
        Row: {
          completion_date: string | null
          created_at: string
          id: string
          module_id: string
          step: number
          user_id: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          id?: string
          module_id: string
          step?: number
          user_id: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          id?: string
          module_id?: string
          step?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progressions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      quizz: {
        Row: {
          bonne_reponse: string
          created_at: string
          explication: string | null
          id: string
          module_id: string
          nom_quizz: string | null
          options: string[]
          question: string
        }
        Insert: {
          bonne_reponse: string
          created_at?: string
          explication?: string | null
          id?: string
          module_id: string
          nom_quizz?: string | null
          options?: string[]
          question: string
        }
        Update: {
          bonne_reponse?: string
          created_at?: string
          explication?: string | null
          id?: string
          module_id?: string
          nom_quizz?: string | null
          options?: string[]
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizz_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      resultat_quiz: {
        Row: {
          date_quiz: string
          id: string
          module_id: string
          pourcentage: number
          score: number
          score_max: number
          user_id: string
        }
        Insert: {
          date_quiz?: string
          id?: string
          module_id: string
          pourcentage?: number
          score?: number
          score_max?: number
          user_id: string
        }
        Update: {
          date_quiz?: string
          id?: string
          module_id?: string
          pourcentage?: number
          score?: number
          score_max?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resultat_quiz_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
