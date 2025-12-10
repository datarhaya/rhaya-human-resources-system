import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      'polyphyodont-dannielle-semiadhesive.ngrok-free.dev',
      '.ngrok-free.app',  // Allow any ngrok-free.app domain
      '.ngrok.io'         // Allow any ngrok.io domain
    ],
    proxy: {
      // Proxy API calls to backend during development
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});