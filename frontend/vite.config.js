import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base relativa para poder servir el build desde cualquier carpeta
  base: './',
  server: { port: 5173 },
});
