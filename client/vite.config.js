import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    allowedHosts: ["raven.neuron9.io", "localhost"],
  },
  headers: {
    "Cache-Control": "no-store",
  },
  hmr: {
    protocol: "wss",
    clientPort: 443,
  },
  optimizeDeps: {
    force: true,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
      "@svg": path.resolve(__dirname, "./src/assets/svg"),
      "@api": path.resolve(__dirname, "./src/api"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@store": path.resolve(__dirname, "./src/store"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@modals": path.resolve(__dirname, "./src/components/Modals"),
      "@providers": path.resolve(__dirname, "./src/providers"),
    },
  },
});
