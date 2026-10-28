export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      alerta_atenciones: {
        Row: {
          alerta_id: string;
          creado_en: string;
          estado: Database['public']['Enums']['estado_alerta'];
          id: string;
          usuario_id: string;
        };
        ComputedFields: never;
        Insert: {
          alerta_id: string;
          creado_en?: string;
          estado: Database['public']['Enums']['estado_alerta'];
          id?: string;
          usuario_id: string;
        };
        Update: {
          alerta_id?: string;
          creado_en?: string;
          estado?: Database['public']['Enums']['estado_alerta'];
          id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alerta_atenciones_alerta_id_fkey';
            columns: ['alerta_id'];
            isOneToOne: false;
            referencedRelation: 'alertas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alerta_atenciones_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
        ];
      };
      alertas: {
        Row: {
          creada_en: string;
          emisor_id: string;
          estado: Database['public']['Enums']['estado_alerta'];
          id: string;
          sector_id: string;
          tipo: Database['public']['Enums']['tipo_alerta'];
          unidad_id: string;
        };
        ComputedFields: never;
        Insert: {
          creada_en?: string;
          emisor_id: string;
          estado?: Database['public']['Enums']['estado_alerta'];
          id?: string;
          sector_id: string;
          tipo: Database['public']['Enums']['tipo_alerta'];
          unidad_id: string;
        };
        Update: {
          creada_en?: string;
          emisor_id?: string;
          estado?: Database['public']['Enums']['estado_alerta'];
          id?: string;
          sector_id?: string;
          tipo?: Database['public']['Enums']['tipo_alerta'];
          unidad_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alertas_emisor_id_fkey';
            columns: ['emisor_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alertas_sector_id_fkey';
            columns: ['sector_id'];
            isOneToOne: false;
            referencedRelation: 'sectores';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alertas_unidad_id_fkey';
            columns: ['unidad_id'];
            isOneToOne: false;
            referencedRelation: 'unidades';
            referencedColumns: ['id'];
          },
        ];
      };
      aviso_sectores: {
        Row: {
          aviso_id: string;
          sector_id: string;
        };
        ComputedFields: never;
        Insert: {
          aviso_id: string;
          sector_id: string;
        };
        Update: {
          aviso_id?: string;
          sector_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'aviso_sectores_aviso_id_fkey';
            columns: ['aviso_id'];
            isOneToOne: false;
            referencedRelation: 'avisos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'aviso_sectores_sector_id_fkey';
            columns: ['sector_id'];
            isOneToOne: false;
            referencedRelation: 'sectores';
            referencedColumns: ['id'];
          },
        ];
      };
      avisos: {
        Row: {
          autor_id: string;
          categoria_id: string;
          creado_en: string;
          descripcion: string;
          id: string;
          imagen_path: string | null;
          para_todos: boolean;
          titulo: string;
          vigente_desde: string;
          vigente_hasta: string;
        };
        ComputedFields: never;
        Insert: {
          autor_id: string;
          categoria_id: string;
          creado_en?: string;
          descripcion: string;
          id?: string;
          imagen_path?: string | null;
          para_todos?: boolean;
          titulo: string;
          vigente_desde: string;
          vigente_hasta: string;
        };
        Update: {
          autor_id?: string;
          categoria_id?: string;
          creado_en?: string;
          descripcion?: string;
          id?: string;
          imagen_path?: string | null;
          para_todos?: boolean;
          titulo?: string;
          vigente_desde?: string;
          vigente_hasta?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'avisos_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'avisos_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias_aviso';
            referencedColumns: ['id'];
          },
        ];
      };
      categorias_aviso: {
        Row: {
          id: string;
          nombre: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          nombre: string;
        };
        Update: {
          id?: string;
          nombre?: string;
        };
        Relationships: [];
      };
      contactos_emergencia: {
        Row: {
          correo: string | null;
          id: string;
          nombre: string;
          orden: number;
          parentesco: string | null;
          telefono: string;
          usuario_id: string;
        };
        ComputedFields: never;
        Insert: {
          correo?: string | null;
          id?: string;
          nombre: string;
          orden: number;
          parentesco?: string | null;
          telefono: string;
          usuario_id: string;
        };
        Update: {
          correo?: string | null;
          id?: string;
          nombre?: string;
          orden?: number;
          parentesco?: string | null;
          telefono?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contactos_emergencia_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
        ];
      };
      dispositivos: {
        Row: {
          actualizado_en: string;
          expo_push_token: string;
          id: string;
          plataforma: Database['public']['Enums']['plataforma_dispositivo'];
          usuario_id: string;
        };
        ComputedFields: never;
        Insert: {
          actualizado_en?: string;
          expo_push_token: string;
          id?: string;
          plataforma: Database['public']['Enums']['plataforma_dispositivo'];
          usuario_id: string;
        };
        Update: {
          actualizado_en?: string;
          expo_push_token?: string;
          id?: string;
          plataforma?: Database['public']['Enums']['plataforma_dispositivo'];
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dispositivos_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
        ];
      };
      encuesta_opciones: {
        Row: {
          id: string;
          orden: number;
          pregunta_id: string;
          texto: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          orden: number;
          pregunta_id: string;
          texto: string;
        };
        Update: {
          id?: string;
          orden?: number;
          pregunta_id?: string;
          texto?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'encuesta_opciones_pregunta_id_fkey';
            columns: ['pregunta_id'];
            isOneToOne: false;
            referencedRelation: 'encuesta_preguntas';
            referencedColumns: ['id'];
          },
        ];
      };
      encuesta_preguntas: {
        Row: {
          encuesta_id: string;
          id: string;
          orden: number;
          seleccion: Database['public']['Enums']['tipo_seleccion'];
          texto: string;
        };
        ComputedFields: never;
        Insert: {
          encuesta_id: string;
          id?: string;
          orden: number;
          seleccion?: Database['public']['Enums']['tipo_seleccion'];
          texto: string;
        };
        Update: {
          encuesta_id?: string;
          id?: string;
          orden?: number;
          seleccion?: Database['public']['Enums']['tipo_seleccion'];
          texto?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'encuesta_preguntas_encuesta_id_fkey';
            columns: ['encuesta_id'];
            isOneToOne: false;
            referencedRelation: 'encuestas';
            referencedColumns: ['id'];
          },
        ];
      };
      encuesta_sectores: {
        Row: {
          encuesta_id: string;
          sector_id: string;
        };
        ComputedFields: never;
        Insert: {
          encuesta_id: string;
          sector_id: string;
        };
        Update: {
          encuesta_id?: string;
          sector_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'encuesta_sectores_encuesta_id_fkey';
            columns: ['encuesta_id'];
            isOneToOne: false;
            referencedRelation: 'encuestas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'encuesta_sectores_sector_id_fkey';
            columns: ['sector_id'];
            isOneToOne: false;
            referencedRelation: 'sectores';
            referencedColumns: ['id'];
          },
        ];
      };
      encuestas: {
        Row: {
          abre_en: string;
          autor_id: string;
          categoria_id: string;
          cierra_en: string;
          creado_en: string;
          descripcion: string | null;
          id: string;
          para_todos: boolean;
          prioridad: Database['public']['Enums']['prioridad_encuesta'];
          resultados_en_vivo: boolean;
          titulo: string;
        };
        ComputedFields: never;
        Insert: {
          abre_en: string;
          autor_id: string;
          categoria_id: string;
          cierra_en: string;
          creado_en?: string;
          descripcion?: string | null;
          id?: string;
          para_todos?: boolean;
          prioridad?: Database['public']['Enums']['prioridad_encuesta'];
          resultados_en_vivo?: boolean;
          titulo: string;
        };
        Update: {
          abre_en?: string;
          autor_id?: string;
          categoria_id?: string;
          cierra_en?: string;
          creado_en?: string;
          descripcion?: string | null;
          id?: string;
          para_todos?: boolean;
          prioridad?: Database['public']['Enums']['prioridad_encuesta'];
          resultados_en_vivo?: boolean;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'encuestas_autor_id_fkey';
            columns: ['autor_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'encuestas_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias_aviso';
            referencedColumns: ['id'];
          },
        ];
      };
      incidencia_fotos: {
        Row: {
          foto_path: string;
          id: string;
          incidencia_id: string;
          orden: number;
        };
        ComputedFields: never;
        Insert: {
          foto_path: string;
          id?: string;
          incidencia_id: string;
          orden: number;
        };
        Update: {
          foto_path?: string;
          id?: string;
          incidencia_id?: string;
          orden?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'incidencia_fotos_incidencia_id_fkey';
            columns: ['incidencia_id'];
            isOneToOne: false;
            referencedRelation: 'incidencias';
            referencedColumns: ['id'];
          },
        ];
      };
      incidencias: {
        Row: {
          actualizada_en: string;
          atendido_por: string | null;
          creada_en: string;
          descripcion: string;
          estado: Database['public']['Enums']['estado_incidencia'];
          id: string;
          reportado_por: string;
          resuelta_en: string | null;
          ubicacion: string;
          unidad_id: string;
        };
        ComputedFields: never;
        Insert: {
          actualizada_en?: string;
          atendido_por?: string | null;
          creada_en?: string;
          descripcion: string;
          estado?: Database['public']['Enums']['estado_incidencia'];
          id?: string;
          reportado_por: string;
          resuelta_en?: string | null;
          ubicacion: string;
          unidad_id: string;
        };
        Update: {
          actualizada_en?: string;
          atendido_por?: string | null;
          creada_en?: string;
          descripcion?: string;
          estado?: Database['public']['Enums']['estado_incidencia'];
          id?: string;
          reportado_por?: string;
          resuelta_en?: string | null;
          ubicacion?: string;
          unidad_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'incidencias_atendido_por_fkey';
            columns: ['atendido_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'incidencias_reportado_por_fkey';
            columns: ['reportado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'incidencias_unidad_id_fkey';
            columns: ['unidad_id'];
            isOneToOne: false;
            referencedRelation: 'unidades';
            referencedColumns: ['id'];
          },
        ];
      };
      pases_visita: {
        Row: {
          anulado_en: string | null;
          creado_en: string;
          estado: Database['public']['Enums']['estado_pase'];
          fecha_visita: string;
          guardia_id: string | null;
          hora_estimada: string | null;
          id: string;
          ingreso_en: string | null;
          nombre_visitante: string;
          residente_id: string;
          salida_en: string | null;
          unidad_id: string;
        };
        ComputedFields: never;
        Insert: {
          anulado_en?: string | null;
          creado_en?: string;
          estado?: Database['public']['Enums']['estado_pase'];
          fecha_visita: string;
          guardia_id?: string | null;
          hora_estimada?: string | null;
          id?: string;
          ingreso_en?: string | null;
          nombre_visitante: string;
          residente_id: string;
          salida_en?: string | null;
          unidad_id: string;
        };
        Update: {
          anulado_en?: string | null;
          creado_en?: string;
          estado?: Database['public']['Enums']['estado_pase'];
          fecha_visita?: string;
          guardia_id?: string | null;
          hora_estimada?: string | null;
          id?: string;
          ingreso_en?: string | null;
          nombre_visitante?: string;
          residente_id?: string;
          salida_en?: string | null;
          unidad_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pases_visita_guardia_id_fkey';
            columns: ['guardia_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pases_visita_residente_id_fkey';
            columns: ['residente_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pases_visita_unidad_id_fkey';
            columns: ['unidad_id'];
            isOneToOne: false;
            referencedRelation: 'unidades';
            referencedColumns: ['id'];
          },
        ];
      };
      perfiles: {
        Row: {
          activo: boolean;
          apellido: string;
          creado_en: string;
          id: string;
          nombre: string;
          rol: Database['public']['Enums']['rol_usuario'];
          telefono: string | null;
          unidad_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          apellido: string;
          creado_en?: string;
          id: string;
          nombre: string;
          rol: Database['public']['Enums']['rol_usuario'];
          telefono?: string | null;
          unidad_id?: string | null;
        };
        Update: {
          activo?: boolean;
          apellido?: string;
          creado_en?: string;
          id?: string;
          nombre?: string;
          rol?: Database['public']['Enums']['rol_usuario'];
          telefono?: string | null;
          unidad_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'perfiles_unidad_id_fkey';
            columns: ['unidad_id'];
            isOneToOne: false;
            referencedRelation: 'unidades';
            referencedColumns: ['id'];
          },
        ];
      };
      registros_sesion: {
        Row: {
          id: string;
          iniciado_en: string;
          usuario_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          iniciado_en?: string;
          usuario_id: string;
        };
        Update: {
          id?: string;
          iniciado_en?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'registros_sesion_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
        ];
      };
      residentes_habilitados: {
        Row: {
          correo: string;
          creado_en: string;
          creado_por: string;
          id: string;
          nombre: string;
          registrado: boolean;
          unidad_id: string;
        };
        ComputedFields: never;
        Insert: {
          correo: string;
          creado_en?: string;
          creado_por: string;
          id?: string;
          nombre: string;
          registrado?: boolean;
          unidad_id: string;
        };
        Update: {
          correo?: string;
          creado_en?: string;
          creado_por?: string;
          id?: string;
          nombre?: string;
          registrado?: boolean;
          unidad_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'residentes_habilitados_creado_por_fkey';
            columns: ['creado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'residentes_habilitados_unidad_id_fkey';
            columns: ['unidad_id'];
            isOneToOne: false;
            referencedRelation: 'unidades';
            referencedColumns: ['id'];
          },
        ];
      };
      sectores: {
        Row: {
          id: string;
          nombre: string;
          tipo: Database['public']['Enums']['tipo_sector'];
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          nombre: string;
          tipo: Database['public']['Enums']['tipo_sector'];
        };
        Update: {
          id?: string;
          nombre?: string;
          tipo?: Database['public']['Enums']['tipo_sector'];
        };
        Relationships: [];
      };
      unidades: {
        Row: {
          codigo: string;
          habilitada: boolean;
          id: string;
          sector_id: string;
        };
        ComputedFields: never;
        Insert: {
          codigo: string;
          habilitada?: boolean;
          id?: string;
          sector_id: string;
        };
        Update: {
          codigo?: string;
          habilitada?: boolean;
          id?: string;
          sector_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'unidades_sector_id_fkey';
            columns: ['sector_id'];
            isOneToOne: false;
            referencedRelation: 'sectores';
            referencedColumns: ['id'];
          },
        ];
      };
      voto_opciones: {
        Row: {
          opcion_id: string;
          pregunta_id: string;
          voto_id: string;
        };
        ComputedFields: never;
        Insert: {
          opcion_id: string;
          pregunta_id: string;
          voto_id: string;
        };
        Update: {
          opcion_id?: string;
          pregunta_id?: string;
          voto_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_voto_opciones_opcion_pregunta';
            columns: ['opcion_id', 'pregunta_id'];
            isOneToOne: false;
            referencedRelation: 'encuesta_opciones';
            referencedColumns: ['id', 'pregunta_id'];
          },
          {
            foreignKeyName: 'voto_opciones_voto_id_fkey';
            columns: ['voto_id'];
            isOneToOne: false;
            referencedRelation: 'votos';
            referencedColumns: ['id'];
          },
        ];
      };
      votos: {
        Row: {
          creado_en: string;
          encuesta_id: string;
          id: string;
          unidad_id: string;
          usuario_id: string;
        };
        ComputedFields: never;
        Insert: {
          creado_en?: string;
          encuesta_id: string;
          id?: string;
          unidad_id: string;
          usuario_id: string;
        };
        Update: {
          creado_en?: string;
          encuesta_id?: string;
          id?: string;
          unidad_id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'votos_encuesta_id_fkey';
            columns: ['encuesta_id'];
            isOneToOne: false;
            referencedRelation: 'encuestas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'votos_unidad_id_fkey';
            columns: ['unidad_id'];
            isOneToOne: false;
            referencedRelation: 'unidades';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'votos_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      reporte_incidencias_mensual: {
        Row: {
          en_atencion: number | null;
          mes: string | null;
          pendientes: number | null;
          resueltas: number | null;
          total: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      emitir_voto: { Args: { p_encuesta_id: string; p_opciones: Json }; Returns: string };
      resultados_encuesta: {
        Args: { p_encuesta_id: string };
        Returns: {
          opcion_id: string;
          pregunta_id: string;
          total: number;
        }[];
      };
    };
    Enums: {
      estado_alerta: 'activa' | 'en_camino' | 'atendida';
      estado_incidencia: 'pendiente' | 'en_atencion' | 'resuelto';
      estado_pase: 'vigente' | 'usado' | 'anulado';
      plataforma_dispositivo: 'android' | 'ios';
      prioridad_encuesta: 'normal' | 'alta';
      rol_usuario: 'directiva' | 'residente' | 'guardia';
      tipo_alerta: 'medica' | 'incendio' | 'seguridad';
      tipo_sector: 'torre' | 'pabellon' | 'manzana';
      tipo_seleccion: 'unica' | 'multiple';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      estado_alerta: ['activa', 'en_camino', 'atendida'],
      estado_incidencia: ['pendiente', 'en_atencion', 'resuelto'],
      estado_pase: ['vigente', 'usado', 'anulado'],
      plataforma_dispositivo: ['android', 'ios'],
      prioridad_encuesta: ['normal', 'alta'],
      rol_usuario: ['directiva', 'residente', 'guardia'],
      tipo_alerta: ['medica', 'incendio', 'seguridad'],
      tipo_sector: ['torre', 'pabellon', 'manzana'],
      tipo_seleccion: ['unica', 'multiple'],
    },
  },
} as const;
