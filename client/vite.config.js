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
  resolve: {
    alias: {
      "@svg": path.resolve(__dirname, "./src/assets/svg"),
    },
  },
});
