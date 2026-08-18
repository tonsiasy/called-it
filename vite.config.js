import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The mini app is served inside a Nimiq Pay WebView; relative asset paths keep
  // it working regardless of the path it is deployed under.
  base: './',
  build: { target: 'es2020' },
})
