import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api-indian': {
        target: 'https://api.indianapi.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-indian/, ''),
      },
      '/proxy-indian': {
        target: 'https://indianapi.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-indian/, ''),
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
