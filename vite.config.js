import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin para injetar a Content Security Policy (CSP) recomendada na build de produção
const cspHtmlPlugin = () => {
  return {
    name: 'csp-html-transform',
    transformIndexHtml(html, ctx) {
      if (ctx.bundle) {
        const cspMeta = `  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self';
          script-src 'self';
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          font-src 'self' https://fonts.gstatic.com;
          connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;
          img-src 'self' data: blob:;">`;
        return html.replace('</head>', `${cspMeta}\n  </head>`);
      }
      return html;
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspHtmlPlugin()],
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
  },
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
  }
})
