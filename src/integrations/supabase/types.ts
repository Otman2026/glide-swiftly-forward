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
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_requests: {
        Row: {
          billing_cycle: string
          created_at: string
          current_plan: Database["public"]["Enums"]["subscription_plan"]
          id: string
          notes: string | null
          requested_by: string | null
          requested_plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          current_plan?: Database["public"]["Enums"]["subscription_plan"]
          id?: string
          notes?: string | null
          requested_by?: string | null
          requested_plan: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          current_plan?: Database["public"]["Enums"]["subscription_plan"]
          id?: string
          notes?: string | null
          requested_by?: string | null
          requested_plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_number: string
          created_at: string
          created_by: string | null
          currency: string | null
          customer_id: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          contract_number: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          contract_number?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          tenant_id: string
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          customer_id: string | null
          doc_type: string
          driver_id: string | null
          expiry_date: string | null
          file_path: string
          file_size: number | null
          id: string
          incident_id: string | null
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          reference_number: string | null
          tenant_id: string
          title: string
          trip_id: string | null
          updated_at: string
          uploaded_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          doc_type: string
          driver_id?: string | null
          expiry_date?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          incident_id?: string | null
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          reference_number?: string | null
          tenant_id: string
          title: string
          trip_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          doc_type?: string
          driver_id?: string | null
          expiry_date?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          incident_id?: string | null
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          reference_number?: string | null
          tenant_id?: string
          title?: string
          trip_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          license_expiry: string | null
          license_number: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["driver_status"]
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          tenant_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          tenant_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          cost: number
          created_at: string
          driver_id: string | null
          fuel_date: string
          id: string
          liters: number
          notes: string | null
          odometer: number | null
          station: string | null
          tenant_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          driver_id?: string | null
          fuel_date?: string
          id?: string
          liters: number
          notes?: string | null
          odometer?: number | null
          station?: string | null
          tenant_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          driver_id?: string | null
          fuel_date?: string
          id?: string
          liters?: number
          notes?: string | null
          odometer?: number | null
          station?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          claim_number: string | null
          created_at: string
          description: string | null
          driver_id: string | null
          id: string
          incident_date: string
          insurance_company: string | null
          location: string | null
          repair_cost: number
          severity: string
          status: string
          tenant_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          claim_number?: string | null
          created_at?: string
          description?: string | null
          driver_id?: string | null
          id?: string
          incident_date?: string
          insurance_company?: string | null
          location?: string | null
          repair_cost?: number
          severity?: string
          status?: string
          tenant_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          claim_number?: string | null
          created_at?: string
          description?: string | null
          driver_id?: string | null
          id?: string
          incident_date?: string
          insurance_company?: string | null
          location?: string | null
          repair_cost?: number
          severity?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_amount: number
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          tenant_id: string
          total: number
          transport_order_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tenant_id: string
          total?: number
          transport_order_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string
          total?: number
          transport_order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_transport_order_id_fkey"
            columns: ["transport_order_id"]
            isOneToOne: false
            referencedRelation: "transport_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          completed_date: string | null
          cost: number
          created_at: string
          id: string
          maintenance_type: string
          notes: string | null
          odometer: number | null
          scheduled_date: string | null
          status: string
          tenant_id: string
          updated_at: string
          vehicle_id: string | null
          workshop: string | null
        }
        Insert: {
          completed_date?: string | null
          cost?: number
          created_at?: string
          id?: string
          maintenance_type: string
          notes?: string | null
          odometer?: number | null
          scheduled_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vehicle_id?: string | null
          workshop?: string | null
        }
        Update: {
          completed_date?: string | null
          cost?: number
          created_at?: string
          id?: string
          maintenance_type?: string
          notes?: string | null
          odometer?: number | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string | null
          workshop?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          severity: string
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          severity?: string
          tenant_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          severity?: string
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          customer_id: string | null
          driver_id: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          customer_id?: string | null
          driver_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          customer_id?: string | null
          driver_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          delivered_at: string | null
          destination: string
          distance_km: number | null
          driver_id: string | null
          id: string
          loaded_at: string | null
          notes: string | null
          order_id: string | null
          origin: string
          shipment_number: string
          status: Database["public"]["Enums"]["shipment_status"]
          tenant_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          destination: string
          distance_km?: number | null
          driver_id?: string | null
          id?: string
          loaded_at?: string | null
          notes?: string | null
          order_id?: string | null
          origin: string
          shipment_number: string
          status?: Database["public"]["Enums"]["shipment_status"]
          tenant_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          destination?: string
          distance_km?: number | null
          driver_id?: string | null
          id?: string
          loaded_at?: string | null
          notes?: string | null
          order_id?: string | null
          origin?: string
          shipment_number?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "transport_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_checkout_sessions: {
        Row: {
          amount_total: number | null
          billing_cycle: string
          created_at: string
          currency: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          requested_by: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_total?: number | null
          billing_cycle: string
          created_at?: string
          currency?: string
          id?: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          requested_by?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_total?: number | null
          billing_cycle?: string
          created_at?: string
          currency?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          requested_by?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_checkout_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          event_type: string
          id: string
          payload: Json
          processed_at: string
        }
        Insert: {
          event_type: string
          id: string
          payload?: Json
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          ends_at: string | null
          id: string
          max_users: number | null
          max_vehicles: number | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_monthly: number | null
          starts_at: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          ends_at?: string | null
          id?: string
          max_users?: number | null
          max_vehicles?: number | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_monthly?: number | null
          starts_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          ends_at?: string | null
          id?: string
          max_users?: number | null
          max_vehicles?: number | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_monthly?: number | null
          starts_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          registration_number: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          registration_number?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          registration_number?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transport_orders: {
        Row: {
          contract_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_id: string
          delivery_date: string | null
          destination: string
          goods_description: string | null
          id: string
          notes: string | null
          order_number: string
          origin: string
          pickup_date: string | null
          price: number | null
          status: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          transport_type: Database["public"]["Enums"]["transport_type"]
          updated_at: string
          weight_tons: number | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id: string
          delivery_date?: string | null
          destination: string
          goods_description?: string | null
          id?: string
          notes?: string | null
          order_number: string
          origin: string
          pickup_date?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          transport_type?: Database["public"]["Enums"]["transport_type"]
          updated_at?: string
          weight_tons?: number | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string
          delivery_date?: string | null
          destination?: string
          goods_description?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          origin?: string
          pickup_date?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id?: string
          transport_type?: Database["public"]["Enums"]["transport_type"]
          updated_at?: string
          weight_tons?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_locations: {
        Row: {
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          speed_kmh: number | null
          tenant_id: string
          trip_id: string
        }
        Insert: {
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          speed_kmh?: number | null
          tenant_id: string
          trip_id: string
        }
        Update: {
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed_kmh?: number | null
          tenant_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cost: number | null
          created_at: string
          customer_id: string | null
          destination: string | null
          distance_km: number | null
          driver_id: string | null
          end_date: string | null
          id: string
          notes: string | null
          origin: string | null
          revenue: number | null
          start_date: string | null
          status: string
          tenant_id: string
          trip_number: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          customer_id?: string | null
          destination?: string | null
          distance_km?: number | null
          driver_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          origin?: string | null
          revenue?: number | null
          start_date?: string | null
          status?: string
          tenant_id: string
          trip_number: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          customer_id?: string | null
          destination?: string | null
          distance_km?: number | null
          driver_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          origin?: string | null
          revenue?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          trip_number?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          archived_at: string | null
          brand: string | null
          capacity_tons: number | null
          created_at: string
          id: string
          inspection_expiry: string | null
          insurance_expiry: string | null
          model: string | null
          notes: string | null
          plate_number: string
          status: Database["public"]["Enums"]["vehicle_status"]
          tenant_id: string
          type: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          archived_at?: string | null
          brand?: string | null
          capacity_tons?: number | null
          created_at?: string
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          model?: string | null
          notes?: string | null
          plate_number: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          tenant_id: string
          type?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          archived_at?: string | null
          brand?: string | null
          capacity_tons?: number | null
          created_at?: string
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          model?: string | null
          notes?: string | null
          plate_number?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          tenant_id?: string
          type?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      violations: {
        Row: {
          created_at: string
          driver_id: string | null
          fine_amount: number
          id: string
          location: string | null
          notes: string | null
          reference_number: string | null
          status: string
          tenant_id: string
          updated_at: string
          vehicle_id: string | null
          violation_date: string
          violation_type: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          fine_amount?: number
          id?: string
          location?: string | null
          notes?: string | null
          reference_number?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vehicle_id?: string | null
          violation_date?: string
          violation_type: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          fine_amount?: number
          id?: string
          location?: string | null
          notes?: string | null
          reference_number?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string | null
          violation_date?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          capacity_m3: number | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string
          id: string
          manager_name: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity_m3?: number | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          id?: string
          manager_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity_m3?: number | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          id?: string
          manager_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_customer: { Args: { _user_id: string }; Returns: string }
      get_user_driver: { Args: { _user_id: string }; Returns: string }
      get_user_tenant: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_system_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "system_owner"
        | "company_admin"
        | "ops_manager"
        | "fleet_manager"
        | "maintenance"
        | "accountant"
        | "receptionist"
        | "driver"
      contract_status: "draft" | "active" | "expired" | "cancelled"
      driver_status: "active" | "on_leave" | "inactive"
      order_status:
        | "pending"
        | "confirmed"
        | "assigned"
        | "in_transit"
        | "delivered"
        | "cancelled"
      shipment_status:
        | "planned"
        | "loading"
        | "in_transit"
        | "delivered"
        | "cancelled"
      subscription_plan: "trial" | "starter" | "professional" | "enterprise"
      tenant_status: "trial" | "active" | "suspended" | "cancelled"
      transport_type:
        | "national"
        | "international"
        | "own_account"
        | "third_party"
      vehicle_status: "available" | "in_use" | "maintenance" | "out_of_service"
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
      app_role: [
        "system_owner",
        "company_admin",
        "ops_manager",
        "fleet_manager",
        "maintenance",
        "accountant",
        "receptionist",
        "driver",
      ],
      contract_status: ["draft", "active", "expired", "cancelled"],
      driver_status: ["active", "on_leave", "inactive"],
      order_status: [
        "pending",
        "confirmed",
        "assigned",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      shipment_status: [
        "planned",
        "loading",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      subscription_plan: ["trial", "starter", "professional", "enterprise"],
      tenant_status: ["trial", "active", "suspended", "cancelled"],
      transport_type: [
        "national",
        "international",
        "own_account",
        "third_party",
      ],
      vehicle_status: ["available", "in_use", "maintenance", "out_of_service"],
    },
  },
} as const
