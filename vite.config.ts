import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // 3000 is the admin panel; auth-service's WEBVIEW_PUJA_BASE_URL points here locally.
  // allowedHosts: lets the dev server be shared through a Cloudflare quick tunnel.
  server: { port: 3002, strictPort: true, allowedHosts: ['.trycloudflare.com'] },
  resolve: { tsconfigPaths: true },
  envPrefix: ['VITE_'],
  build: {
    rolldownOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
  plugins: [tailwindcss(), tanstackStart({ srcDirectory: 'src' }), viteReact(), nitro()],
});
