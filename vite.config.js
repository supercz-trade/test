import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      css: {
        additionalData: `@import "./src/styles/tokens.css"; @import "./src/styles/global.css";`,
      },
    },
  },
  server: {
    host: true,
    allowedHosts: 'all',
  },
});