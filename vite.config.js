import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Use repo subpath on GitHub Pages (CI); keep "/" for local dev
export default defineConfig({
  plugins: [react()],
  base: process.env.CI ? '/aaron-birthday/' : '/',
})
