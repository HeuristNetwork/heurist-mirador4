import { defineConfig } from 'vite';

export default defineConfig({
  base: './',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,

    rollupOptions: {
      input: 'src/main.js',
      output: {
        entryFileNames: 'heurist-mirador4.js',
        chunkFileNames: 'heurist-mirador4-[name].js',
        assetFileNames: 'heurist-mirador4-[name][extname]'
      }
    }
  },

  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/heurist': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
        secure: false
      }
    }    
  }
});