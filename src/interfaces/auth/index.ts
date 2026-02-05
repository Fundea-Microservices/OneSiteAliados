

export interface IPuesto {
    puestoId?: string;  // UUID del puesto
    nombre: string;    // Nombre del puesto
    // Relaciones
    usuarios?: IUsuario[];  // Usuarios asociados al puesto
}

export interface IUsuario {
  userId?: string;             // UUID del usuario
  fullName: string;        // Nombre completo concatenado  
  userName: string;              // Nombre de usuario (único)
  password: string;                 // Contraseña (hash)
  email: string;                // Correo electrónico (único)
  photoUrl?: string | null;  
  lastPasswordUpdate: Date;      // Última actualización de contraseña
  huella?: string | null;        // Huella digital (en base64 u otro formato)
  active: boolean;               // Estado del usuario (activo/inactivo)
  rolId: string;                 // ID del rol asignado
  puestoId?: string | null;      // ID del puesto (si aplica)
  new?: boolean;                  // Indica si es un usuario nuevo
  // Relaciones
  rol?: IRol;                    // Objeto del rol relacionado
  puesto?: IPuesto;              // Objeto del puesto relacionado

  // Auditoría
  created_at: Date;
  updated_at?: Date | null;
  deleted_at?: Date | null;
}

export interface IAcceso {
  accesoId?: string;              // UUID del acceso
  ordenMenu: number;             // Orden del menú
  showApp: boolean;              // Si se muestra en la app móvil
  showWeb: boolean;              // Si se muestra en la web
  activo: boolean;               // Estado del acceso

  mainMenuId?: string | null;    // ID del menú principal (si aplica)
  menuId: string;                // ID del menú relacionado
  rolId: string;                 // ID del rol relacionado

  // Relaciones (opcionalmente incluidas en consultas)
  menu: IMenu;
  subMenus?: ISubmenu[];
  rol?: IRol;

  // Auditoría
  created_at: Date;
  updated_at?: Date | null;
  deleted_at?: Date | null;
}

export interface ISubmenu {
  accesoId?: string;              // UUID del acceso
  ordenMenu: number;             // Orden del menú
  showApp: boolean;              // Si se muestra en la app móvil
  showWeb: boolean;              // Si se muestra en la web
  activo: boolean;               // Estado del acceso

  mainMenuId?: string | null;    // ID del menú principal (si aplica)
  menuId: string;                // ID del menú relacionado
  rolId: string;                 // ID del rol relacionado

  // Relaciones (opcionalmente incluidas en consultas)
  menu: IMenu;

  // Auditoría
  created_at: Date;
  updated_at?: Date | null;
  deleted_at?: Date | null;
}


export interface IRol {
    rolId?: string;          // UUID
    nombre: string;         // Nombre del rol
    activo: boolean;        // Indica si está activo
    esAdmin: boolean;       // Indica si tiene privilegios de administrador
    global: boolean;
    empresaId?: string,

    // Relaciones
    usuarios?: IUsuario[];  // Usuarios asociados al rol
    accesos?: IAcceso[];    // Accesos asociados al rol

    // Metadatos de auditoría
    created_at: Date;
    updated_at?: Date | null;
    deleted_at?: Date | null;
}

export interface ILogin {
  user: IUsuario,
  token: string
  rol?: IRol,
  empresas?: IEmpresa[]
}


export interface IMenu {
  menuId?: string;        // UUID del menú
  label: string;          // Nombre o etiqueta del menú
  descripcion: string;    // Descripción del menú
  pathApp: string;        // Ruta de la aplicación móvil o cliente
  pathWeb: string;        // Ruta de la aplicación web
  icono: string;          // Nombre del ícono asociado
  color: string;          // Color del ícono o del menú
  principal: boolean;     // Indica si es un menú principal
  activo: boolean;        // Indica si el menú está activo

  // Relaciones
  accesos?: IAcceso[];    // Lista de accesos asociados al menú

  // Metadatos de auditoría
  created_at: Date;       // Fecha de creación
  updated_at?: Date | null; // Fecha de última actualización
  deleted_at?: Date | null; // Fecha de eliminación (soft delete)
}

export enum TipoConfiguracion {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
}
/**
 * Representa una configuración del sistema.
 */
export interface IConfig {
  configId?: string;            // UUID único de la configuración
  llave: string;                // Clave identificadora de la configuración (ej. "TOKEN_EXPIRATION")
  valor: string;                // Valor de la configuración (almacenado como texto)
  tipo: TipoConfiguracion;      // Tipo de dato (string, number, boolean, array, object)
  descripcion?: string | null;  // Descripción opcional sobre el uso de la configuración
  activo: boolean;              // Indica si la configuración está activa

  // Metadatos de auditoría
  created_at: Date;             // Fecha de creación
  updated_at?: Date | null;     // Fecha de última actualización
  deleted_at?: Date | null;     // Fecha de eliminación lógica
}


export interface IEmpresa {
  empresaId: string;
  nombreEmpresa: string;
  nit: string;
  telefono: string;
  direccion: string;
  activo: boolean;
}