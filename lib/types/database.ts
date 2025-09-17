// Database types based on Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          stripe_customer_id: string | null
          subscription_status: string | null
          plan_tier: 'starter' | 'professional' | 'enterprise'
          retell_api_key: string | null
          timezone: string | null
          usage_minutes_total: number | null
          usage_minutes_mtd: number | null
          usage_last_reset_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          stripe_customer_id?: string | null
          subscription_status?: string | null
          plan_tier?: 'starter' | 'professional' | 'enterprise'
          retell_api_key?: string | null
          timezone?: string | null
          usage_minutes_total?: number | null
          usage_minutes_mtd?: number | null
          usage_last_reset_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          stripe_customer_id?: string | null
          subscription_status?: string | null
          plan_tier?: 'starter' | 'professional' | 'enterprise'
          retell_api_key?: string | null
          timezone?: string | null
          usage_minutes_total?: number | null
          usage_minutes_mtd?: number | null
          usage_last_reset_at?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          role: 'admin' | 'manager' | 'viewer'
          platform_role: string | null
          email: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          organization_id?: string | null
          role?: 'admin' | 'manager' | 'viewer'
          platform_role?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: 'admin' | 'manager' | 'viewer'
          platform_role?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      agents: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          type: 'sales' | 'support' | 'appointment' | 'survey' | 'custom'
          retell_agent_id: string | null
          workflow_config: Json | null
          prompt_template: string | null
          voice_config: Json | null
          status: 'active' | 'inactive' | 'draft'
          template_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          type: 'sales' | 'support' | 'appointment' | 'survey' | 'custom'
          retell_agent_id?: string | null
          workflow_config?: Json | null
          prompt_template?: string | null
          voice_config?: Json | null
          status?: 'active' | 'inactive' | 'draft'
          template_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          type?: 'sales' | 'support' | 'appointment' | 'survey' | 'custom'
          retell_agent_id?: string | null
          workflow_config?: Json | null
          prompt_template?: string | null
          voice_config?: Json | null
          status?: 'active' | 'inactive' | 'draft'
          template_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          organization_id: string | null
          agent_id: string | null
          campaign_id: string | null
          batch_call_id: string | null
          phone_number_id: string | null
          retell_call_id: string | null
          retell_agent_id: string | null
          retell_batch_call_id: string | null
          phone_number: string
          from_phone: string | null
          to_phone: string | null
          crm_id: string | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'failed'
          direction: 'inbound' | 'outbound'
          call_type: 'web_call' | 'phone_call' | null
          duration_seconds: number | null
          cost: number | null
          recording_url: string | null
          transcript: string | null
          call_analysis: Json | null
          disconnect_reason: string | null
          metadata: Json | null
          risk_score: number | null
          risk_factors: Json | null
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          agent_id?: string | null
          campaign_id?: string | null
          batch_call_id?: string | null
          phone_number_id?: string | null
          retell_call_id?: string | null
          retell_agent_id?: string | null
          retell_batch_call_id?: string | null
          phone_number: string
          from_phone?: string | null
          to_phone?: string | null
          crm_id?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'failed'
          direction: 'inbound' | 'outbound'
          call_type?: 'web_call' | 'phone_call' | null
          duration_seconds?: number | null
          cost?: number | null
          recording_url?: string | null
          transcript?: string | null
          call_analysis?: Json | null
          disconnect_reason?: string | null
          metadata?: Json | null
          risk_score?: number | null
          risk_factors?: Json | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          agent_id?: string | null
          campaign_id?: string | null
          batch_call_id?: string | null
          phone_number_id?: string | null
          retell_call_id?: string | null
          retell_agent_id?: string | null
          retell_batch_call_id?: string | null
          phone_number?: string
          from_phone?: string | null
          to_phone?: string | null
          crm_id?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'failed'
          direction?: 'inbound' | 'outbound'
          call_type?: 'web_call' | 'phone_call' | null
          duration_seconds?: number | null
          cost?: number | null
          recording_url?: string | null
          transcript?: string | null
          call_analysis?: Json | null
          disconnect_reason?: string | null
          metadata?: Json | null
          risk_score?: number | null
          risk_factors?: Json | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
      }
      phone_numbers: {
        Row: {
          id: string
          phone_number: string
          display_name: string | null
          provider: string | null
          retell_phone_number_id: string | null
          provider_phone_number_id: string | null
          status: 'active' | 'inactive' | 'pending'
          capabilities: Json | null
          max_concurrent_calls: number | null
          rate_limit_per_minute: number | null
          notes: string | null
          created_at: string
          updated_at: string | null
          retell_inbound_agent_id: string | null
          retell_outbound_agent_id: string | null
        }
        Insert: {
          id?: string
          phone_number: string
          display_name?: string | null
          provider?: string | null
          retell_phone_number_id?: string | null
          provider_phone_number_id?: string | null
          status?: 'active' | 'inactive' | 'pending'
          capabilities?: Json | null
          max_concurrent_calls?: number | null
          rate_limit_per_minute?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
          retell_inbound_agent_id?: string | null
          retell_outbound_agent_id?: string | null
        }
        Update: {
          id?: string
          phone_number?: string
          display_name?: string | null
          provider?: string | null
          retell_phone_number_id?: string | null
          provider_phone_number_id?: string | null
          status?: 'active' | 'inactive' | 'pending'
          capabilities?: Json | null
          max_concurrent_calls?: number | null
          rate_limit_per_minute?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
          retell_inbound_agent_id?: string | null
          retell_outbound_agent_id?: string | null
        }
      }
      organization_phone_assignments: {
        Row: {
          id: string
          organization_id: string | null
          phone_number_id: string | null
          is_primary: boolean
          assigned_at: number | null
          assigned_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          phone_number_id?: string | null
          is_primary?: boolean
          assigned_at?: number | null
          assigned_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          phone_number_id?: string | null
          is_primary?: boolean
          assigned_at?: number | null
          assigned_by?: string | null
          created_at?: string
        }
      }
      call_campaigns: {
        Row: {
          id: string
          organization_id: string | null
          agent_id: string | null
          name: string
          csv_file_url: string | null
          total_numbers: number
          processed_numbers: number
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused'
          trigger_job_id: string | null
          created_at: string
          updated_at: string | null
          original_csv_url: string | null
          csv_content: Json | null
          csv_validation_errors: Json | null
          can_retry: boolean
          last_retry_at: string | null
          retry_count: number
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id?: string | null
          agent_id?: string | null
          name: string
          csv_file_url?: string | null
          total_numbers?: number
          processed_numbers?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused'
          trigger_job_id?: string | null
          created_at?: string
          updated_at?: string | null
          original_csv_url?: string | null
          csv_content?: Json | null
          csv_validation_errors?: Json | null
          can_retry?: boolean
          last_retry_at?: string | null
          retry_count?: number
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          agent_id?: string | null
          name?: string
          csv_file_url?: string | null
          total_numbers?: number
          processed_numbers?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused'
          trigger_job_id?: string | null
          created_at?: string
          updated_at?: string | null
          original_csv_url?: string | null
          csv_content?: Json | null
          csv_validation_errors?: Json | null
          can_retry?: boolean
          last_retry_at?: string | null
          retry_count?: number
          created_by?: string | null
        }
      }
      batch_calls: {
        Row: {
          id: string
          organization_id: string | null
          campaign_id: string | null
          agent_id: string | null
          phone_number_id: string | null
          retell_batch_call_id: string
          batch_name: string
          from_number: string
          total_task_count: number
          status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled'
          scheduled_timestamp: string | null
          created_at: string
          updated_at: string | null
          reserved_concurrency: number | null
        }
        Insert: {
          id?: string
          organization_id?: string | null
          campaign_id?: string | null
          agent_id?: string | null
          phone_number_id?: string | null
          retell_batch_call_id: string
          batch_name: string
          from_number: string
          total_task_count?: number
          status?: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled'
          scheduled_timestamp?: string | null
          created_at?: string
          updated_at?: string | null
          reserved_concurrency?: number | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          campaign_id?: string | null
          agent_id?: string | null
          phone_number_id?: string | null
          retell_batch_call_id?: string
          batch_name?: string
          from_number?: string
          total_task_count?: number
          status?: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled'
          scheduled_timestamp?: string | null
          created_at?: string
          updated_at?: string | null
          reserved_concurrency?: number | null
        }
      }
      campaign_contacts: {
        Row: {
          id: string
          campaign_id: string
          name: string
          phone: string
          email: string | null
          company: string | null
          notes: string | null
          status: 'pending' | 'calling' | 'completed' | 'failed' | 'cancelled'
          call_id: string | null
          attempted_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          phone: string
          email?: string | null
          company?: string | null
          notes?: string | null
          status?: 'pending' | 'calling' | 'completed' | 'failed' | 'cancelled'
          call_id?: string | null
          attempted_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          phone?: string
          email?: string | null
          company?: string | null
          notes?: string | null
          status?: 'pending' | 'calling' | 'completed' | 'failed' | 'cancelled'
          call_id?: string | null
          attempted_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          call_id: string | null
          organization_id: string | null
          contact_name: string
          contact_phone: string
          scheduled_time: string
          status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          call_id?: string | null
          organization_id?: string | null
          contact_name: string
          contact_phone: string
          scheduled_time: string
          status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string | null
          organization_id?: string | null
          contact_name?: string
          contact_phone?: string
          scheduled_time?: string
          status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_org_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_calls_count_today: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'viewer'
      plan_tier: 'starter' | 'professional' | 'enterprise'
      agent_type: 'sales' | 'support' | 'appointment' | 'survey' | 'custom'
      agent_status: 'active' | 'inactive' | 'draft'
      call_status: 'scheduled' | 'in_progress' | 'completed' | 'failed'
      call_direction: 'inbound' | 'outbound'
      campaign_status: 'pending' | 'processing' | 'completed' | 'failed'
      appointment_status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
    }
  }
}