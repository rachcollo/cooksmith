import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

import { validateBuildEnv } from './src/config/env'

export default defineConfig(({ mode }) => {
  validateBuildEnv({ ...process.env, ...loadEnv(mode, process.cwd(), '') })

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 4173,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
    },
  }
})
