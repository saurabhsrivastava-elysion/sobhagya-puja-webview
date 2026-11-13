import { defineConfig } from 'nitro';

export default defineConfig({
  rolldownConfig: {
    onwarn(warning, warn) {
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
      warn(warning);
    },
  },
});
