import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  // Root directory for source files
  root: '.',
  
  // Public directory for static assets
  publicDir: 'public',
  
  // Build configuration
  build: {
    // Output directory matching the PHP project structure
    outDir: 'dist',
    
    // Don't empty outDir to preserve PHP files
    emptyOutDir: false,
    
    // Generate sourcemaps for development
    sourcemap: true,
    
    // Minify with terser
    minify: 'terser',
    
    // Terser options
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // Rollup options
    rollupOptions: {
      input: {
        // Main entry point that will include all JS/CSS
        main: resolve(__dirname, 'src/main.js')
      },
      output: {
        // Output structure matching current PHP expectations
        entryFileNames: 'js/[name].min.js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name].min[extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  
  // Dev server configuration  
  server: {
    port: 3000,
    open: false,
    // Serve static files from the project root
    fs: {
      allow: ['..']
    }
  },
  
  // CSS preprocessing
  css: {
    preprocessorOptions: {
      less: {
        // Add variables import to all LESS files
        additionalData: `@import "${resolve(__dirname, 'less/variables.less')}";`
      }
    }
  }
})