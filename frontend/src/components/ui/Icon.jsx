import {
  ArrowLeftRight, Box, Circle, ClipboardList, Contact, Layers, PackagePlus, Receipt, Truck, Users, Vault, Wrench,
} from 'lucide-react';

// Íconos referenciados por nombre desde src/config/roles.js.
// Se importan uno a uno para no incluir toda la librería en el build.
const ICONS = { ArrowLeftRight, Box, ClipboardList, Contact, Layers, PackagePlus, Receipt, Truck, Users, Vault, Wrench };

export default function Icon({ name, size = 18, ...rest }) {
  const Cmp = ICONS[name] || Circle;
  return <Cmp size={size} aria-hidden {...rest} />;
}
