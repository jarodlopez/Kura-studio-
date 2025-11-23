import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Plugin necesario para que Vite procese y use React/JSX
  plugins: [react()],
  // Esto es crucial para asegurar que las rutas se resuelvan correctamente
  base: '/',
  // Esto puede ayudar a resolver conflictos de capitalización y rutas
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  }
});
