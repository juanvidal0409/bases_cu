import { Route, Routes } from 'react-router-dom';
import { ROLES } from './config/roles.js';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

import Login from './pages/acceso/Login.jsx';
import Inicio from './pages/acceso/Inicio.jsx';
import Perfil from './pages/acceso/Perfil.jsx';
import { NoEncontrada, SinPermiso } from './pages/acceso/Mensajes.jsx';

import InventarioPage from './pages/almacen/InventarioPage.jsx';
import Solicitudes from './pages/almacen/Solicitudes.jsx';
import Compras from './pages/almacen/Compras.jsx';
import Prestamos from './pages/almacen/Prestamos.jsx';

import CajasFuertes from './pages/produccion/CajasFuertes.jsx';
import Modelos from './pages/produccion/Modelos.jsx';

import Ventas from './pages/ventas/Ventas.jsx';
import Clientes from './pages/ventas/Clientes.jsx';

import EmpleadosPage from './pages/admin/EmpleadosPage.jsx';
import Proveedores from './pages/admin/Proveedores.jsx';

const { ADMINISTRADOR, GESTOR_ALMACEN, GESTOR_PRODUCCION, GESTOR_VENTAS, CONTADOR } = ROLES;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Inicio />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="sin-permiso" element={<SinPermiso />} />

        {/* Módulo de gestión de almacén */}
        <Route path="almacen" element={<ProtectedRoute roles={[GESTOR_ALMACEN]} />}>
          <Route path="materiales" element={<InventarioPage key="m" tipo="Material" />} />
          <Route path="herramientas" element={<InventarioPage key="h" tipo="Herramienta" />} />
          <Route path="modelos" element={<Modelos readOnly />} />
          <Route path="solicitudes" element={<Solicitudes />} />
          <Route path="compras" element={<Compras />} />
          <Route path="prestamos" element={<Prestamos />} />
        </Route>

        {/* Módulo de gestión de producción */}
        <Route path="produccion" element={<ProtectedRoute roles={[GESTOR_PRODUCCION]} />}>
          <Route path="cajas" element={<CajasFuertes />} />
          <Route path="modelos" element={<Modelos />} />
          <Route path="empleados" element={<EmpleadosPage canCreate canEdit canDelete description="Personal de planta que participa en la fabricación de cajas fuertes." />} />
        </Route>

        {/* Módulo de ventas */}
        <Route path="ventas" element={<ProtectedRoute roles={[GESTOR_VENTAS]} />}>
          <Route path="ventas" element={<Ventas />} />
          <Route path="clientes" element={<Clientes />} />
        </Route>

        {/* Módulo de administración */}
        <Route path="admin" element={<ProtectedRoute roles={[ADMINISTRADOR]} />}>
          <Route path="empleados" element={<EmpleadosPage canCreate canEdit canAssignRole description="Empleados de la empresa y el rol con el que acceden a GIA." />} />
          <Route path="proveedores" element={<Proveedores />} />
        </Route>

        {/* Módulo de contabilidad */}
        <Route path="contabilidad" element={<ProtectedRoute roles={[CONTADOR]} />}>
          <Route path="empleados" element={<EmpleadosPage description="Listado de empleados de la empresa." />} />
          <Route path="ventas" element={<Ventas readOnly />} />
          <Route path="compras" element={<Compras readOnly />} />
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
