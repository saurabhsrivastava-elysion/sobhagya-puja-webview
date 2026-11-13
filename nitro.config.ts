import { defineConfig } from 'nitro';

export default defineConfig({
  rolldownConfig: {
    onwarn(warning, warn) {
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
      warn(warning);
    },
  },
  // Used by `pnpm build:cf` (NITRO_PRESET=cloudflare-module). Nitro writes the Worker to .output/ and a
  // wrangler config there, merged from ./wrangler.jsonc. A plain `pnpm build` still targets Node.
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
  },
});
