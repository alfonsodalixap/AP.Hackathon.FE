import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@alixpartners/ui-components/dist/assets/main.css": resolve(
        "node_modules/@alixpartners/ui-components/dist/assets/main.css"
      ),
    },
  },
});
