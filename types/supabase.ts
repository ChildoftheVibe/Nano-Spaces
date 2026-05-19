export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          org_id: string
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          org_id: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          org_id?: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'activity_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_log_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      availability_rules: {
        Row: {
          block_holidays: boolean
          close_time: string
          day_of_week: number[]
          id: string
          location_id: string
          open_time: string
        }
        Insert: {
          block_holidays?: boolean
          close_time: string
          day_of_week: number[]
          id?: string
          location_id: string
          open_time: string
        }
        Update: {
          block_holidays?: boolean
          close_time?: string
          day_of_week?: number[]
          id?: string
          location_id?: string
          open_time?: string
        }
        Relationships: [
          {
            foreignKeyName: 'availability_rules_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      blackout_dates: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          is_recurring: boolean
          location_id: string | null
          org_id: string
          recur_rule: string | null
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          is_recurring?: boolean
          location_id?: string | null
          org_id: string
          recur_rule?: string | null
          start_time: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          is_recurring?: boolean
          location_id?: string | null
          org_id?: string
          recur_rule?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blackout_dates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blackout_dates_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blackout_dates_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      email_otp_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          purpose: string
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          is_used?: boolean
          purpose?: string
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          purpose?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_otp_codes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      invitations: {
        Row: {
          accepted: boolean
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          last_sent_at: string | null
          org_id: string
          resend_count: number
          revoked: boolean
          role: string
          token_hash: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          last_sent_at?: string | null
          org_id: string
          resend_count?: number
          revoked?: boolean
          role?: string
          token_hash: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          last_sent_at?: string | null
          org_id?: string
          resend_count?: number
          revoked?: boolean
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitations_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          amount_usd: number
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          org_id: string
          paypal_transaction_id: string | null
          pdf_url: string | null
          status: string
          tier: string
        }
        Insert: {
          amount_usd: number
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          org_id: string
          paypal_transaction_id?: string | null
          pdf_url?: string | null
          status?: string
          tier: string
        }
        Update: {
          amount_usd?: number
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          org_id?: string
          paypal_transaction_id?: string | null
          pdf_url?: string | null
          status?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      locations: {
        Row: {
          approval_required: boolean
          cancel_notice_hours: number
          capacity: number | null
          created_at: string
          description: string | null
          ghost_buster_enabled: boolean
          ghost_buster_mins: number
          id: string
          in_maintenance: boolean
          is_active: boolean
          maintenance_from: string | null
          maintenance_note: string | null
          maintenance_to: string | null
          max_advance_days: number
          max_booking_duration_mins: number | null
          max_bookings_per_user_per_day: number | null
          min_notice_hours: number
          name: string
          name_fts: unknown
          nano_buffer_mins: number
          notes: string | null
          org_id: string
          photo_url: string | null
          type: string
        }
        Insert: {
          approval_required?: boolean
          cancel_notice_hours?: number
          capacity?: number | null
          created_at?: string
          description?: string | null
          ghost_buster_enabled?: boolean
          ghost_buster_mins?: number
          id?: string
          in_maintenance?: boolean
          is_active?: boolean
          maintenance_from?: string | null
          maintenance_note?: string | null
          maintenance_to?: string | null
          max_advance_days?: number
          max_booking_duration_mins?: number | null
          max_bookings_per_user_per_day?: number | null
          min_notice_hours?: number
          name: string
          name_fts?: unknown
          nano_buffer_mins?: number
          notes?: string | null
          org_id: string
          photo_url?: string | null
          type: string
        }
        Update: {
          approval_required?: boolean
          cancel_notice_hours?: number
          capacity?: number | null
          created_at?: string
          description?: string | null
          ghost_buster_enabled?: boolean
          ghost_buster_mins?: number
          id?: string
          in_maintenance?: boolean
          is_active?: boolean
          maintenance_from?: string | null
          maintenance_note?: string | null
          maintenance_to?: string | null
          max_advance_days?: number
          max_booking_duration_mins?: number | null
          max_bookings_per_user_per_day?: number | null
          min_notice_hours?: number
          name?: string
          name_fts?: unknown
          nano_buffer_mins?: number
          notes?: string | null
          org_id?: string
          photo_url?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'locations_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          org_id: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          id?: string
          org_id: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          display_name: string
          email_signature: string | null
          grace_period_ends_at: string | null
          id: string
          logo_url: string | null
          master_admin_email_optin: boolean
          name: string
          paypal_plan_id: string | null
          paypal_subscription_id: string | null
          primary_timezone: string
          slug: string
          subscription_expires_at: string | null
          subscription_status: string
          subscription_tier: string
          tier_admin_limit: number
          tier_room_limit: number
          tier_user_limit: number | null
          tos_accepted_at: string | null
          tos_version_accepted: string | null
          trial_day13_sent: boolean
          trial_day7_sent: boolean
          trial_ends_at: string
          trial_starts_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email_signature?: string | null
          grace_period_ends_at?: string | null
          id?: string
          logo_url?: string | null
          master_admin_email_optin?: boolean
          name: string
          paypal_plan_id?: string | null
          paypal_subscription_id?: string | null
          primary_timezone?: string
          slug: string
          subscription_expires_at?: string | null
          subscription_status?: string
          subscription_tier?: string
          tier_admin_limit?: number
          tier_room_limit?: number
          tier_user_limit?: number | null
          tos_accepted_at?: string | null
          tos_version_accepted?: string | null
          trial_day13_sent?: boolean
          trial_day7_sent?: boolean
          trial_ends_at?: string
          trial_starts_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email_signature?: string | null
          grace_period_ends_at?: string | null
          id?: string
          logo_url?: string | null
          master_admin_email_optin?: boolean
          name?: string
          paypal_plan_id?: string | null
          paypal_subscription_id?: string | null
          primary_timezone?: string
          slug?: string
          subscription_expires_at?: string | null
          subscription_status?: string
          subscription_tier?: string
          tier_admin_limit?: number
          tier_room_limit?: number
          tier_user_limit?: number | null
          tos_accepted_at?: string | null
          tos_version_accepted?: string | null
          trial_day13_sent?: boolean
          trial_day7_sent?: boolean
          trial_ends_at?: string
          trial_starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organizations_tos_version_accepted_fkey'
            columns: ['tos_version_accepted']
            isOneToOne: false
            referencedRelation: 'tos_versions'
            referencedColumns: ['version']
          },
        ]
      }
      processed_webhooks: {
        Row: {
          event_id: string
          processed_at: string
          source: string
        }
        Insert: {
          event_id: string
          processed_at?: string
          source: string
        }
        Update: {
          event_id?: string
          processed_at?: string
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_wake_token: string | null
          created_at: string
          email: string
          email_change_expires_at: string | null
          email_change_token_hash: string | null
          email_reminders: boolean
          failed_login_attempts: number
          full_name: string
          full_name_fts: unknown
          hibernate_status: string
          hibernated_at: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          last_active_at: string | null
          locked_until: string | null
          org_id: string | null
          pending_email: string | null
          reminder_timing: string | null
          role: string
          timezone: string
          tos_accepted_at: string | null
          tos_version_accepted: string | null
          totp_enabled: boolean
          totp_reset_requested: boolean
          totp_secret: string | null
          two_fa_method: string
        }
        Insert: {
          auto_wake_token?: string | null
          created_at?: string
          email: string
          email_change_expires_at?: string | null
          email_change_token_hash?: string | null
          email_reminders?: boolean
          failed_login_attempts?: number
          full_name?: string
          full_name_fts?: unknown
          hibernate_status?: string
          hibernated_at?: string | null
          id: string
          invited_by?: string | null
          is_active?: boolean
          last_active_at?: string | null
          locked_until?: string | null
          org_id?: string | null
          pending_email?: string | null
          reminder_timing?: string | null
          role: string
          timezone?: string
          tos_accepted_at?: string | null
          tos_version_accepted?: string | null
          totp_enabled?: boolean
          totp_reset_requested?: boolean
          totp_secret?: string | null
          two_fa_method?: string
        }
        Update: {
          auto_wake_token?: string | null
          created_at?: string
          email?: string
          email_change_expires_at?: string | null
          email_change_token_hash?: string | null
          email_reminders?: boolean
          failed_login_attempts?: number
          full_name?: string
          full_name_fts?: unknown
          hibernate_status?: string
          hibernated_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          last_active_at?: string | null
          locked_until?: string | null
          org_id?: string | null
          pending_email?: string | null
          reminder_timing?: string | null
          role?: string
          timezone?: string
          tos_accepted_at?: string | null
          tos_version_accepted?: string | null
          totp_enabled?: boolean
          totp_reset_requested?: boolean
          totp_secret?: string | null
          two_fa_method?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_tos_version_accepted_fkey'
            columns: ['tos_version_accepted']
            isOneToOne: false
            referencedRelation: 'tos_versions'
            referencedColumns: ['version']
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      reservations: {
        Row: {
          booked_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          end_time: string
          god_mode_by: string | null
          god_mode_override: boolean
          god_mode_reason: string | null
          id: string
          location_id: string | null
          notes: string | null
          org_id: string
          original_booker_id: string | null
          recurring_group_id: string | null
          reminder_1h_sent: boolean
          reminder_sent: boolean
          start_time: string
          status: string
          title: string
          title_fts: unknown
        }
        Insert: {
          booked_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          end_time: string
          god_mode_by?: string | null
          god_mode_override?: boolean
          god_mode_reason?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          org_id: string
          original_booker_id?: string | null
          recurring_group_id?: string | null
          reminder_1h_sent?: boolean
          reminder_sent?: boolean
          start_time: string
          status?: string
          title: string
          title_fts?: unknown
        }
        Update: {
          booked_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          end_time?: string
          god_mode_by?: string | null
          god_mode_override?: boolean
          god_mode_reason?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          org_id?: string
          original_booker_id?: string | null
          recurring_group_id?: string | null
          reminder_1h_sent?: boolean
          reminder_sent?: boolean
          start_time?: string
          status?: string
          title?: string
          title_fts?: unknown
        }
        Relationships: [
          {
            foreignKeyName: 'reservations_booked_by_fkey'
            columns: ['booked_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservations_cancelled_by_fkey'
            columns: ['cancelled_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservations_god_mode_by_fkey'
            columns: ['god_mode_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservations_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservations_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservations_original_booker_id_fkey'
            columns: ['original_booker_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tos_versions: {
        Row: {
          content_url: string
          created_at: string
          effective_at: string
          version: string
        }
        Insert: {
          content_url: string
          created_at?: string
          effective_at: string
          version: string
        }
        Update: {
          content_url?: string
          created_at?: string
          effective_at?: string
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_org_id: { Args: never; Returns: string }
      auth_role: { Args: never; Returns: string }
      create_reservation_with_locks: {
        Args: {
          p_booked_by: string
          p_end_time: string
          p_location_id: string
          p_notes: string
          p_org_id: string
          p_start_time: string
          p_title: string
        }
        Returns: string
      }
      release_ghost_reservation: {
        Args: { p_reservation_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// Domain row type aliases
export type Organization = Tables<'organizations'>
export type Profile = Tables<'profiles'>
export type Location = Tables<'locations'>
export type AvailabilityRule = Tables<'availability_rules'>
export type BlackoutDate = Tables<'blackout_dates'>
export type Reservation = Tables<'reservations'>
export type Invitation = Tables<'invitations'>
export type Notification = Tables<'notifications'>
export type PushSubscription = Tables<'push_subscriptions'>
export type Invoice = Tables<'invoices'>
export type ActivityLog = Tables<'activity_log'>
export type ProcessedWebhook = Tables<'processed_webhooks'>
export type TosVersion = Tables<'tos_versions'>
export type EmailOtpCode = Tables<'email_otp_codes'>
