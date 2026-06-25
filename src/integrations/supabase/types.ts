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
      employees: {
        Row: {
          created_at: string
          email: string
          id: string
          manager_id: string
          name: string
          permissions: string | null
          position: string | null
          role: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          manager_id: string
          name: string
          permissions?: string | null
          position?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          manager_id?: string
          name?: string
          permissions?: string | null
          position?: string | null
          role?: string | null
        }
        Relationships: []
      }
      funding_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string | null
          read: boolean
          request_id: string
          target_employee_id: string | null
          target_manager_id: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          read?: boolean
          request_id: string
          target_employee_id?: string | null
          target_manager_id?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          read?: boolean
          request_id?: string
          target_employee_id?: string | null
          target_manager_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "funding_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_requests: {
        Row: {
          ai_message: string | null
          amount: number
          attachment_name: string | null
          attachment_url: string | null
          company_name: string
          created_at: string
          id: string
          manager_id: string
          manager_name: string | null
          mode: string | null
          reason: string | null
          recipient_email: string | null
          rejected_by_name: string | null
          rejection_reason: string | null
          repayment_period: string | null
          request_date: string
          status: string
        }
        Insert: {
          ai_message?: string | null
          amount?: number
          attachment_name?: string | null
          attachment_url?: string | null
          company_name: string
          created_at?: string
          id?: string
          manager_id: string
          manager_name?: string | null
          mode?: string | null
          reason?: string | null
          recipient_email?: string | null
          rejected_by_name?: string | null
          rejection_reason?: string | null
          repayment_period?: string | null
          request_date?: string
          status?: string
        }
        Update: {
          ai_message?: string | null
          amount?: number
          attachment_name?: string | null
          attachment_url?: string | null
          company_name?: string
          created_at?: string
          id?: string
          manager_id?: string
          manager_name?: string | null
          mode?: string | null
          reason?: string | null
          recipient_email?: string | null
          rejected_by_name?: string | null
          rejection_reason?: string | null
          repayment_period?: string | null
          request_date?: string
          status?: string
        }
        Relationships: []
      }
      funding_votes: {
        Row: {
          created_at: string
          decision: string
          id: string
          request_id: string
          voter_employee_id: string | null
          voter_name: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          request_id: string
          voter_employee_id?: string | null
          voter_name?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          request_id?: string
          voter_employee_id?: string | null
          voter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_votes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "funding_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          meeting_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          meeting_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          id: string
          manager_id: string
          meeting_date: string
          meeting_time: string | null
          priority: string
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          manager_id: string
          meeting_date: string
          meeting_time?: string | null
          priority?: string
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string
          meeting_date?: string
          meeting_time?: string | null
          priority?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string | null
          read: boolean
          recipient_type: string
          task_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          read?: boolean
          recipient_type?: string
          task_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          read?: boolean
          recipient_type?: string
          task_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: string | null
          created_at: string
          description: string | null
          employees: string | null
          id: string
          industry: string | null
          manager_id: string
          name: string
          stage: string | null
          timeline: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          budget?: string | null
          created_at?: string
          description?: string | null
          employees?: string | null
          id?: string
          industry?: string | null
          manager_id: string
          name: string
          stage?: string | null
          timeline?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          budget?: string | null
          created_at?: string
          description?: string | null
          employees?: string | null
          id?: string
          industry?: string | null
          manager_id?: string
          name?: string
          stage?: string | null
          timeline?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_files: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          is_revision: boolean
          task_id: string
          uploaded_by: string | null
          uploader_role: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          is_revision?: boolean
          task_id: string
          uploaded_by?: string | null
          uploader_role?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          is_revision?: boolean
          task_id?: string
          uploaded_by?: string | null
          uploader_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_ratings: {
        Row: {
          created_at: string
          id: string
          note: string | null
          ratee_id: string
          rater_id: string
          rater_role: string
          stars: number
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          ratee_id: string
          rater_id: string
          rater_role?: string
          stars: number
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          ratee_id?: string
          rater_id?: string
          rater_role?: string
          stars?: number
          task_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assigned_by_role: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          employee_id: string
          forwarded_to_owner: boolean
          id: string
          manager_id: string
          name: string
          owner_status: string | null
          parent_task_id: string | null
          priority: string
          project_name: string | null
          revision_count: number
          revision_note: string | null
          status: string
          submission_name: string | null
          submission_url: string | null
          submitted_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_by_role?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          employee_id: string
          forwarded_to_owner?: boolean
          id?: string
          manager_id: string
          name: string
          owner_status?: string | null
          parent_task_id?: string | null
          priority?: string
          project_name?: string | null
          revision_count?: number
          revision_note?: string | null
          status?: string
          submission_name?: string | null
          submission_url?: string | null
          submitted_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_by_role?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          employee_id?: string
          forwarded_to_owner?: boolean
          id?: string
          manager_id?: string
          name?: string
          owner_status?: string | null
          parent_task_id?: string | null
          priority?: string
          project_name?: string | null
          revision_count?: number
          revision_note?: string | null
          status?: string
          submission_name?: string | null
          submission_url?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
