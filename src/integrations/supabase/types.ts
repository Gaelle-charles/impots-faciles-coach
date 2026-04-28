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
          {
            foreignKeyName: "contenus_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_profils: {
        Row: {
          created_at: string | null
          description: string | null
          icone: string | null
          id: string
          is_active: boolean | null
          nom: string
          numero: number
          order_display: number | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icone?: string | null
          id?: string
          is_active?: boolean | null
          nom: string
          numero: number
          order_display?: number | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icone?: string | null
          id?: string
          is_active?: boolean | null
          nom?: string
          numero?: number
          order_display?: number | null
          slug?: string
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          context: string
          created_at: string
          document_type: string
          document_version: string
          id: string
          ip_address: string | null
          metadata: Json | null
          plan: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          accepted_at: string
          context: string
          created_at?: string
          document_type: string
          document_version?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          plan?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          context?: string
          created_at?: string
          document_type?: string
          document_version?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          plan?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      metiers: {
        Row: {
          categorie: string | null
          code_ref: string | null
          created_at: string
          description: string | null
          icone: string | null
          id: string
          is_active: boolean | null
          nom: string
          order_display: number | null
          slug: string | null
          sous_categorie: string | null
        }
        Insert: {
          categorie?: string | null
          code_ref?: string | null
          created_at?: string
          description?: string | null
          icone?: string | null
          id?: string
          is_active?: boolean | null
          nom: string
          order_display?: number | null
          slug?: string | null
          sous_categorie?: string | null
        }
        Update: {
          categorie?: string | null
          code_ref?: string | null
          created_at?: string
          description?: string | null
          icone?: string | null
          id?: string
          is_active?: boolean | null
          nom?: string
          order_display?: number | null
          slug?: string | null
          sous_categorie?: string | null
        }
        Relationships: []
      }
      modules: {
        Row: {
          accessibilite: string[]
          created_at: string
          id: string
          is_published: boolean
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
          is_published?: boolean
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
          is_published?: boolean
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
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          revoked_at: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          revoked_at?: string | null
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          revoked_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          email: string
          id: string
          invitation_token: string | null
          invited_at: string
          organization_id: string
          removed_at: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          email: string
          id?: string
          invitation_token?: string | null
          invited_at?: string
          organization_id: string
          removed_at?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          email?: string
          id?: string
          invitation_token?: string | null
          invited_at?: string
          organization_id?: string
          removed_at?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_user_id: string | null
          adresse: string | null
          created_at: string
          date_paiement: string | null
          id: string
          logo_url: string | null
          nb_licences: number
          plan: string
          raison_sociale: string
          siret: string
          statut: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tva_intra: string | null
          updated_at: string
        }
        Insert: {
          admin_user_id?: string | null
          adresse?: string | null
          created_at?: string
          date_paiement?: string | null
          id?: string
          logo_url?: string | null
          nb_licences: number
          plan: string
          raison_sociale: string
          siret: string
          statut?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tva_intra?: string | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string | null
          adresse?: string | null
          created_at?: string
          date_paiement?: string | null
          id?: string
          logo_url?: string | null
          nb_licences?: number
          plan?: string
          raison_sociale?: string
          siret?: string
          statut?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tva_intra?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pays: {
        Row: {
          code_iso: string | null
          created_at: string | null
          icone: string | null
          id: string
          is_active: boolean | null
          nom: string
          order_display: number | null
          slug: string | null
          type: string | null
          zone: string
        }
        Insert: {
          code_iso?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          is_active?: boolean | null
          nom: string
          order_display?: number | null
          slug?: string | null
          type?: string | null
          zone: string
        }
        Update: {
          code_iso?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          is_active?: boolean | null
          nom?: string
          order_display?: number | null
          slug?: string | null
          type?: string | null
          zone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          a_activite_secondaire: boolean | null
          a_investissements_defisc: boolean | null
          a_placements: boolean | null
          a_revenus_etrangers: boolean | null
          a_revenus_fonciers_nus: boolean | null
          a_revenus_lmnp: boolean | null
          activite_type: string | null
          aidant_familial: boolean | null
          created_at: string
          date_paiement: string | null
          email: string | null
          forme_juridique: string | null
          id: string
          is_active: boolean
          metier_categorie: string | null
          metier_id: string | null
          metier_precis: string | null
          metier_secondaire_categorie: string | null
          metier_secondaire_precis: string | null
          metiers_detectes: string[] | null
          nb_enfants_charge: number | null
          nom: string | null
          onboarding_completed_at: string | null
          onboarding_done: boolean
          organization_id: string | null
          pays_concernes: string[] | null
          pension_alimentaire: boolean | null
          personne_handicap: boolean | null
          plan: string
          plan_recommande: string | null
          prenom: string | null
          primo_declarant: boolean | null
          profils_detectes: string[] | null
          role: string
          score_complexite: number | null
          situation_familiale: string | null
          situation_internationale: string | null
          situation_principale: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tranche_revenus: string | null
        }
        Insert: {
          a_activite_secondaire?: boolean | null
          a_investissements_defisc?: boolean | null
          a_placements?: boolean | null
          a_revenus_etrangers?: boolean | null
          a_revenus_fonciers_nus?: boolean | null
          a_revenus_lmnp?: boolean | null
          activite_type?: string | null
          aidant_familial?: boolean | null
          created_at?: string
          date_paiement?: string | null
          email?: string | null
          forme_juridique?: string | null
          id: string
          is_active?: boolean
          metier_categorie?: string | null
          metier_id?: string | null
          metier_precis?: string | null
          metier_secondaire_categorie?: string | null
          metier_secondaire_precis?: string | null
          metiers_detectes?: string[] | null
          nb_enfants_charge?: number | null
          nom?: string | null
          onboarding_completed_at?: string | null
          onboarding_done?: boolean
          organization_id?: string | null
          pays_concernes?: string[] | null
          pension_alimentaire?: boolean | null
          personne_handicap?: boolean | null
          plan?: string
          plan_recommande?: string | null
          prenom?: string | null
          primo_declarant?: boolean | null
          profils_detectes?: string[] | null
          role?: string
          score_complexite?: number | null
          situation_familiale?: string | null
          situation_internationale?: string | null
          situation_principale?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tranche_revenus?: string | null
        }
        Update: {
          a_activite_secondaire?: boolean | null
          a_investissements_defisc?: boolean | null
          a_placements?: boolean | null
          a_revenus_etrangers?: boolean | null
          a_revenus_fonciers_nus?: boolean | null
          a_revenus_lmnp?: boolean | null
          activite_type?: string | null
          aidant_familial?: boolean | null
          created_at?: string
          date_paiement?: string | null
          email?: string | null
          forme_juridique?: string | null
          id?: string
          is_active?: boolean
          metier_categorie?: string | null
          metier_id?: string | null
          metier_precis?: string | null
          metier_secondaire_categorie?: string | null
          metier_secondaire_precis?: string | null
          metiers_detectes?: string[] | null
          nb_enfants_charge?: number | null
          nom?: string | null
          onboarding_completed_at?: string | null
          onboarding_done?: boolean
          organization_id?: string | null
          pays_concernes?: string[] | null
          pension_alimentaire?: boolean | null
          personne_handicap?: boolean | null
          plan?: string
          plan_recommande?: string | null
          prenom?: string | null
          primo_declarant?: boolean | null
          profils_detectes?: string[] | null
          role?: string
          score_complexite?: number | null
          situation_familiale?: string | null
          situation_internationale?: string | null
          situation_principale?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tranche_revenus?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_metier_id_fkey"
            columns: ["metier_id"]
            isOneToOne: false
            referencedRelation: "metiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          {
            foreignKeyName: "progressions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_with_counts"
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
          ordre: number
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
          ordre?: number
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
          ordre?: number
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
          {
            foreignKeyName: "quizz_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_with_counts"
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
          tentative_numero: number
          user_id: string
        }
        Insert: {
          date_quiz?: string
          id?: string
          module_id: string
          pourcentage?: number
          score?: number
          score_max?: number
          tentative_numero?: number
          user_id: string
        }
        Update: {
          date_quiz?: string
          id?: string
          module_id?: string
          pourcentage?: number
          score?: number
          score_max?: number
          tentative_numero?: number
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
          {
            foreignKeyName: "resultat_quiz_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          created_at: string | null
          donnees: Json
          id: string
          impot_net: number | null
          inputs: Json
          nom: string | null
          results: Json
          simulator_id: string
          taux_moyen: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          donnees: Json
          id?: string
          impot_net?: number | null
          inputs: Json
          nom?: string | null
          results: Json
          simulator_id?: string
          taux_moyen?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          donnees?: Json
          id?: string
          impot_net?: number | null
          inputs?: Json
          nom?: string | null
          results?: Json
          simulator_id?: string
          taux_moyen?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      modules_with_counts: {
        Row: {
          accessibilite: string[] | null
          created_at: string | null
          id: string | null
          is_published: boolean | null
          module_slug: string | null
          nb_steps_total: number | null
          order: number | null
          text_resultat_expert: string | null
          text_resultat_faible: string | null
          text_resultat_moyen: string | null
          titre: string | null
          total_step: number | null
        }
        Insert: {
          accessibilite?: string[] | null
          created_at?: string | null
          id?: string | null
          is_published?: boolean | null
          module_slug?: string | null
          nb_steps_total?: never
          order?: number | null
          text_resultat_expert?: string | null
          text_resultat_faible?: string | null
          text_resultat_moyen?: string | null
          titre?: string | null
          total_step?: number | null
        }
        Update: {
          accessibilite?: string[] | null
          created_at?: string | null
          id?: string | null
          is_published?: boolean | null
          module_slug?: string | null
          nb_steps_total?: never
          order?: number | null
          text_resultat_expert?: string | null
          text_resultat_faible?: string | null
          text_resultat_moyen?: string | null
          titre?: string | null
          total_step?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: Json }
      activate_admin_license: { Args: never; Returns: Json }
      deactivate_admin_license: { Args: never; Returns: Json }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          organization_id: string
          organization_name: string
          plan: string
          status: string
        }[]
      }
      get_module_progress: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: {
          nb_completed: number
          nb_total: number
        }[]
      }
      get_user_global_progress: {
        Args: { p_user_id: string }
        Returns: {
          completed_steps: number
          modules_accessible: number
          modules_completed: number
          total_steps: number
        }[]
      }
      get_user_organization: {
        Args: { p_user_id: string }
        Returns: {
          logo_url: string
          org_id: string
          plan: string
          raison_sociale: string
          role: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_of_org: { Args: { p_org_id: string }; Returns: boolean }
      is_org_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_user_org_admin: { Args: { p_user_id: string }; Returns: boolean }
      org_admin_has_license: { Args: { p_user_id: string }; Returns: boolean }
      user_can_access_module: { Args: { _module_id: string }; Returns: boolean }
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
