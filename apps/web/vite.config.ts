import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../../", "");
  const apiPort = Number(env.API_PORT) || 4000;
  const webPort = Number(env.WEB_PORT) || 3010;
  const apiTarget = `http://localhost:${apiPort}`;

  return {
    plugins: [react()],
    envDir: "../../",
    server: {
      port: webPort,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/auth": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
