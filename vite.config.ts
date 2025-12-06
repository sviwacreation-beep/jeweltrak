
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' ensures we load all keys, including those without VITE_ prefix (like API_KEY).
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Expose environment variables to the browser as process.env
    define: {
      'process.env': env
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
    },
  };
});
