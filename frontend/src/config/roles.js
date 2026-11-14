// Roles del sistema (RN01) y navegación por módulo.
// Cada actor del diagrama de casos de uso hereda de "Usuario" y solo ve su módulo (RNF04).

export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  GESTOR_ALMACEN: 'GESTOR_ALMACEN',
  GESTOR_PRODUCCION: 'GESTOR_PRODUCCION',
  GESTOR_VENTAS: 'GESTOR_VENTAS',
  CONTADOR: 'CONTADOR',
};

export const ROLE_LABELS = {
  ADMINISTRADOR: 'Administrador',
  GESTOR_ALMACEN: 'Gestor de almacén',
  GESTOR_PRODUCCION: 'Gestor de producción',
  GESTOR_VENTAS: 'Gestor de ventas',
  CONTADOR: 'Contador',
};

// Módulos: cada uno corresponde a un paquete de casos de uso del modelo.
// "options" son las opciones que despliega el caso de uso "Desplegar opciones de …".
export const MODULES = [
  {
    key: 'almacen',
    title: 'Almacén',
    description: 'Inventario, solicitudes, compras y préstamos de herramientas.',
    roles: [ROLES.GESTOR_ALMACEN],
    options: [
      { to: '/almacen/materiales', label: 'Materiales', icon: 'Layers' },
      { to: '/almacen/herramientas', label: 'Herramientas', icon: 'Wrench' },
      { to: '/almacen/modelos', label: 'Modelos de cajas', icon: 'Box' },
      { to: '/almacen/solicitudes', label: 'Solicitudes de compra', icon: 'ClipboardList' },
      { to: '/almacen/compras', label: 'Compras', icon: 'PackagePlus' },
      { to: '/almacen/prestamos', label: 'Préstamos', icon: 'ArrowLeftRight' },
    ],
  },
  {
    key: 'produccion',
    title: 'Producción',
    description: 'Cajas fuertes fabricadas, modelos y su receta, y personal de planta.',
    roles: [ROLES.GESTOR_PRODUCCION],
    options: [
      { to: '/produccion/cajas', label: 'Cajas fuertes', icon: 'Vault' },
      { to: '/produccion/modelos', label: 'Modelos', icon: 'Box' },
      { to: '/produccion/empleados', label: 'Empleados', icon: 'Users' },
    ],
  },
  {
    key: 'ventas',
    title: 'Ventas',
    description: 'Registro de ventas de cajas fuertes y cartera de clientes.',
    roles: [ROLES.GESTOR_VENTAS],
    options: [
      { to: '/ventas/ventas', label: 'Ventas', icon: 'Receipt' },
      { to: '/ventas/clientes', label: 'Clientes', icon: 'Contact' },
    ],
  },
  {
    key: 'admin',
    title: 'Administración',
    description: 'Empleados con su rol de acceso y proveedores de la empresa.',
    roles: [ROLES.ADMINISTRADOR],
    options: [
      { to: '/admin/empleados', label: 'Empleados', icon: 'Users' },
      { to: '/admin/proveedores', label: 'Proveedores', icon: 'Truck' },
    ],
  },
  {
    key: 'contabilidad',
    title: 'Consultas',
    description: 'Listados de empleados, ventas y compras para contabilidad.',
    roles: [ROLES.CONTADOR],
    options: [
      { to: '/contabilidad/empleados', label: 'Empleados', icon: 'Users' },
      { to: '/contabilidad/ventas', label: 'Ventas', icon: 'Receipt' },
      { to: '/contabilidad/compras', label: 'Compras', icon: 'PackagePlus' },
    ],
  },
];

export function modulesForRole(rol) {
  return MODULES.filter((m) => m.roles.includes(rol));
}
