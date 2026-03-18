import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs'
import path from 'path'

function bilderListPlugin() {
  return {
    name: 'bilder-list',
    resolveId(id) {
      if (id === 'virtual:bilder-list') return '\0virtual:bilder-list'
    },
    load(id) {
      if (id === '\0virtual:bilder-list') {
        const bilderDir = path.resolve(process.cwd(), 'public/bilder');
        let files = [];
        if (fs.existsSync(bilderDir)) {
          files = fs.readdirSync(bilderDir).filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f));
        }
        return `export const bilderList = ${JSON.stringify(files)};`
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile(), bilderListPlugin()],
})
