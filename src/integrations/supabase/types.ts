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
      cargos: {
        Row: {
          cantidad: number | null
          concepto: string
          concepto_cargo_id: string | null
          created_at: string | null
          fecha: string | null
          habitacion_id: string | null
          hotel_id: string
          id: string
          notas: string | null
          precio_unitario: number | null
          reserva_id: string | null
          total: number | null
        }
        Insert: {
          cantidad?: number | null
          concepto: string
          concepto_cargo_id?: string | null
          created_at?: string | null
          fecha?: string | null
          habitacion_id?: string | null
          hotel_id: string
          id?: string
          notas?: string | null
          precio_unitario?: number | null
          reserva_id?: string | null
          total?: number | null
        }
        Update: {
          cantidad?: number | null
          concepto?: string
          concepto_cargo_id?: string | null
          created_at?: string | null
          fecha?: string | null
          habitacion_id?: string | null
          hotel_id?: string
          id?: string
          notas?: string | null
          precio_unitario?: number | null
          reserva_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_concepto_cargo_id_fkey"
            columns: ["concepto_cargo_id"]
            isOneToOne: false
            referencedRelation: "conceptos_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "habitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string | null
          created_at: string | null
          email: string | null
          es_vip: boolean | null
          hotel_id: string
          id: string
          nacionalidad: string | null
          nivel_lealtad: string | null
          nombre: string
          notas: string | null
          numero_documento: string | null
          telefono: string | null
          tipo_cliente: string | null
          tipo_documento: string | null
          total_estancias: number | null
          updated_at: string | null
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno?: string | null
          created_at?: string | null
          email?: string | null
          es_vip?: boolean | null
          hotel_id: string
          id?: string
          nacionalidad?: string | null
          nivel_lealtad?: string | null
          nombre: string
          notas?: string | null
          numero_documento?: string | null
          telefono?: string | null
          tipo_cliente?: string | null
          tipo_documento?: string | null
          total_estancias?: number | null
          updated_at?: string | null
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string | null
          created_at?: string | null
          email?: string | null
          es_vip?: boolean | null
          hotel_id?: string
          id?: string
          nacionalidad?: string | null
          nivel_lealtad?: string | null
          nombre?: string
          notas?: string | null
          numero_documento?: string | null
          telefono?: string | null
          tipo_cliente?: string | null
          tipo_documento?: string | null
          total_estancias?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      conceptos_cargo: {
        Row: {
          created_at: string | null
          descripcion: string | null
          hotel_id: string
          id: string
          nombre: string
          precio: number | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          hotel_id: string
          id?: string
          nombre: string
          precio?: number | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          hotel_id?: string
          id?: string
          nombre?: string
          precio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conceptos_cargo_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      entregables: {
        Row: {
          costo_reposicion: number | null
          created_at: string | null
          descripcion: string | null
          hotel_id: string
          id: string
          nombre: string
          stock: number | null
        }
        Insert: {
          costo_reposicion?: number | null
          created_at?: string | null
          descripcion?: string | null
          hotel_id: string
          id?: string
          nombre: string
          stock?: number | null
        }
        Update: {
          costo_reposicion?: number | null
          created_at?: string | null
          descripcion?: string | null
          hotel_id?: string
          id?: string
          nombre?: string
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entregables_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      entregables_reserva: {
        Row: {
          cantidad: number | null
          cantidad_devuelta: number | null
          costo_faltante: number | null
          devuelto: boolean | null
          entregable_id: string | null
          fecha_devolucion: string | null
          fecha_entrega: string | null
          id: string
          notas: string | null
          reserva_id: string
        }
        Insert: {
          cantidad?: number | null
          cantidad_devuelta?: number | null
          costo_faltante?: number | null
          devuelto?: boolean | null
          entregable_id?: string | null
          fecha_devolucion?: string | null
          fecha_entrega?: string | null
          id?: string
          notas?: string | null
          reserva_id: string
        }
        Update: {
          cantidad?: number | null
          cantidad_devuelta?: number | null
          costo_faltante?: number | null
          devuelto?: boolean | null
          entregable_id?: string | null
          fecha_devolucion?: string | null
          fecha_entrega?: string | null
          id?: string
          notas?: string | null
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregables_reserva_entregable_id_fkey"
            columns: ["entregable_id"]
            isOneToOne: false
            referencedRelation: "entregables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregables_reserva_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      habitaciones: {
        Row: {
          created_at: string | null
          estado_habitacion: string | null
          estado_limpieza: string | null
          estado_mantenimiento: string | null
          hotel_id: string
          id: string
          notas: string | null
          numero: string
          piso: number | null
          tipo_habitacion_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado_habitacion?: string | null
          estado_limpieza?: string | null
          estado_mantenimiento?: string | null
          hotel_id: string
          id?: string
          notas?: string | null
          numero: string
          piso?: number | null
          tipo_habitacion_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado_habitacion?: string | null
          estado_limpieza?: string | null
          estado_mantenimiento?: string | null
          hotel_id?: string
          id?: string
          notas?: string | null
          numero?: string
          piso?: number | null
          tipo_habitacion_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habitaciones_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habitaciones_tipo_habitacion_id_fkey"
            columns: ["tipo_habitacion_id"]
            isOneToOne: false
            referencedRelation: "tipos_habitacion"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          ciudad: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          estado: string | null
          estrellas: number | null
          hora_checkin: string | null
          hora_checkout: string | null
          id: string
          logo_url: string | null
          nombre: string
          pais: string | null
          razon_social: string | null
          rfc: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          ciudad?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          estado?: string | null
          estrellas?: number | null
          hora_checkin?: string | null
          hora_checkout?: string | null
          id?: string
          logo_url?: string | null
          nombre: string
          pais?: string | null
          razon_social?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          ciudad?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          estado?: string | null
          estrellas?: number | null
          hora_checkin?: string | null
          hora_checkout?: string | null
          id?: string
          logo_url?: string | null
          nombre?: string
          pais?: string | null
          razon_social?: string | null
          rfc?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pagos: {
        Row: {
          created_at: string | null
          fecha: string | null
          hotel_id: string
          id: string
          metodo_pago: string | null
          monto: number
          notas: string | null
          numero_pago: string | null
          referencia: string | null
          reserva_id: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          fecha?: string | null
          hotel_id: string
          id?: string
          metodo_pago?: string | null
          monto: number
          notas?: string | null
          numero_pago?: string | null
          referencia?: string | null
          reserva_id?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          fecha?: string | null
          hotel_id?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          numero_pago?: string | null
          referencia?: string | null
          reserva_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean | null
          apellido_materno: string | null
          apellido_paterno: string | null
          created_at: string | null
          email: string | null
          foto_url: string | null
          hotel_id: string | null
          id: string
          nombre: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          apellido_materno?: string | null
          apellido_paterno?: string | null
          created_at?: string | null
          email?: string | null
          foto_url?: string | null
          hotel_id?: string | null
          id: string
          nombre: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          apellido_materno?: string | null
          apellido_paterno?: string | null
          created_at?: string | null
          email?: string | null
          foto_url?: string | null
          hotel_id?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          adultos: number | null
          checkin_realizado: boolean | null
          checkout_realizado: boolean | null
          cliente_id: string | null
          created_at: string | null
          descuento: number | null
          estado: string | null
          fecha_checkin: string
          fecha_checkout: string
          habitacion_id: string | null
          hora_llegada: string | null
          hotel_id: string
          id: string
          ninos: number | null
          noches: number | null
          notas: string | null
          numero_reserva: string | null
          origen: string | null
          saldo_pendiente: number | null
          solicitudes_especiales: string | null
          subtotal_hospedaje: number | null
          tarifa_noche: number | null
          tipo_habitacion_id: string | null
          total: number | null
          total_impuestos: number | null
          total_pagado: number | null
          updated_at: string | null
        }
        Insert: {
          adultos?: number | null
          checkin_realizado?: boolean | null
          checkout_realizado?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          descuento?: number | null
          estado?: string | null
          fecha_checkin: string
          fecha_checkout: string
          habitacion_id?: string | null
          hora_llegada?: string | null
          hotel_id: string
          id?: string
          ninos?: number | null
          noches?: number | null
          notas?: string | null
          numero_reserva?: string | null
          origen?: string | null
          saldo_pendiente?: number | null
          solicitudes_especiales?: string | null
          subtotal_hospedaje?: number | null
          tarifa_noche?: number | null
          tipo_habitacion_id?: string | null
          total?: number | null
          total_impuestos?: number | null
          total_pagado?: number | null
          updated_at?: string | null
        }
        Update: {
          adultos?: number | null
          checkin_realizado?: boolean | null
          checkout_realizado?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          descuento?: number | null
          estado?: string | null
          fecha_checkin?: string
          fecha_checkout?: string
          habitacion_id?: string | null
          hora_llegada?: string | null
          hotel_id?: string
          id?: string
          ninos?: number | null
          noches?: number | null
          notas?: string | null
          numero_reserva?: string | null
          origen?: string | null
          saldo_pendiente?: number | null
          solicitudes_especiales?: string | null
          subtotal_hospedaje?: number | null
          tarifa_noche?: number | null
          tipo_habitacion_id?: string | null
          total?: number | null
          total_impuestos?: number | null
          total_pagado?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "habitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_tipo_habitacion_id_fkey"
            columns: ["tipo_habitacion_id"]
            isOneToOne: false
            referencedRelation: "tipos_habitacion"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_limpieza: {
        Row: {
          asignado_a: string | null
          asignado_nombre: string | null
          created_at: string | null
          estado: string | null
          fecha: string | null
          habitacion_id: string | null
          hora_fin: string | null
          hora_inicio: string | null
          hotel_id: string
          id: string
          notas: string | null
          prioridad: string | null
          tipo: string | null
        }
        Insert: {
          asignado_a?: string | null
          asignado_nombre?: string | null
          created_at?: string | null
          estado?: string | null
          fecha?: string | null
          habitacion_id?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          hotel_id: string
          id?: string
          notas?: string | null
          prioridad?: string | null
          tipo?: string | null
        }
        Update: {
          asignado_a?: string | null
          asignado_nombre?: string | null
          created_at?: string | null
          estado?: string | null
          fecha?: string | null
          habitacion_id?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          hotel_id?: string
          id?: string
          notas?: string | null
          prioridad?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_limpieza_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "habitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_limpieza_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_mantenimiento: {
        Row: {
          asignado_a: string | null
          asignado_nombre: string | null
          costo_estimado: number | null
          costo_real: number | null
          created_at: string | null
          descripcion: string | null
          estado: string | null
          fecha_completado: string | null
          fecha_estimada: string | null
          fecha_reporte: string | null
          habitacion_id: string | null
          hotel_id: string
          id: string
          notas: string | null
          prioridad: string | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          asignado_a?: string | null
          asignado_nombre?: string | null
          costo_estimado?: number | null
          costo_real?: number | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_completado?: string | null
          fecha_estimada?: string | null
          fecha_reporte?: string | null
          habitacion_id?: string | null
          hotel_id: string
          id?: string
          notas?: string | null
          prioridad?: string | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          asignado_a?: string | null
          asignado_nombre?: string | null
          costo_estimado?: number | null
          costo_real?: number | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_completado?: string | null
          fecha_estimada?: string | null
          fecha_reporte?: string | null
          habitacion_id?: string | null
          hotel_id?: string
          id?: string
          notas?: string | null
          prioridad?: string | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_mantenimiento_habitacion_id_fkey"
            columns: ["habitacion_id"]
            isOneToOne: false
            referencedRelation: "habitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_mantenimiento_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_habitacion: {
        Row: {
          amenidades: string[] | null
          capacidad_adultos: number | null
          capacidad_maxima: number | null
          capacidad_ninos: number | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          hotel_id: string
          id: string
          nombre: string
          precio_base: number | null
          precio_persona_extra: number | null
        }
        Insert: {
          amenidades?: string[] | null
          capacidad_adultos?: number | null
          capacidad_maxima?: number | null
          capacidad_ninos?: number | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          hotel_id: string
          id?: string
          nombre: string
          precio_base?: number | null
          precio_persona_extra?: number | null
        }
        Update: {
          amenidades?: string[] | null
          capacidad_adultos?: number | null
          capacidad_maxima?: number | null
          capacidad_ninos?: number | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          hotel_id?: string
          id?: string
          nombre?: string
          precio_base?: number | null
          precio_persona_extra?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tipos_habitacion_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role:
        | "Admin"
        | "Recepcion"
        | "Housekeeping"
        | "Mantenimiento"
        | "Gerente"
        | "SuperAdmin"
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
        "Admin",
        "Recepcion",
        "Housekeeping",
        "Mantenimiento",
        "Gerente",
        "SuperAdmin",
      ],
    },
  },
} as const
