import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { COMPANY } from './src/data/company.js'
import { buildVCard, cardUrl } from './src/lib/digitalCard.js'

// Đọc thông tin liên hệ của ban lãnh đạo từ src/data/team.js (tệp đó import ảnh nên không import trực tiếp ở đây được).
function readLeadership() {
  const src = readFileSync(resolve('src/data/team.js'), 'utf8')
  const blocks = src.split(/\n\s*slug: "/).slice(1)
  const pick = (block, key) => block.match(new RegExp(`\\n\\s*${key}: "([^"]*)"`))?.[1]
  const people = blocks.map((block) => ({
    slug: block.slice(0, block.indexOf('"')),
    name: pick(block, 'name'),
    title: pick(block, 'title'),
    titleVi: pick(block, 'titleVi'),
    phone: pick(block, 'phone'),
    email: pick(block, 'email'),
  }))
  for (const p of people) {
    for (const [k, v] of Object.entries(p)) if (!v) throw new Error(`[digital-card] Thiếu "${k}" của ${p.slug} trong src/data/team.js`)
  }
  return people
}

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Thẻ danh thiếp số: sau khi build, tạo cho mỗi thành viên
 *  - dist/card/<slug>/index.html: cùng ứng dụng, nhưng thẻ meta riêng để Zalo/Facebook hiện tên, chức danh và ảnh khi chia sẻ link;
 *  - dist/card/<slug>/contact.vcf, contact-en.vcf: tệp danh bạ (có ảnh) để "Lưu vào danh bạ" mở thẳng trên điện thoại.
 */
function digitalCardPages() {
  return {
    name: 'facs-digital-card-pages',
    apply: 'build',
    closeBundle() {
      const dist = resolve('dist')
      const shell = readFileSync(resolve(dist, 'index.html'), 'utf8')
      for (const p of readLeadership()) {
        const dir = resolve(dist, 'card', p.slug)
        mkdirSync(dir, { recursive: true })
        const url = cardUrl(p.slug)
        const image = `${COMPANY.url}/card/${p.slug}.jpg`
        const title = `${p.name} · ${COMPANY.name}`
        const description = `${p.titleVi} · ${p.title}. ${COMPANY.sloganVi}.`
        const meta = [
          `<title>${escHtml(title)}</title>`,
          `<meta name="description" content="${escHtml(description)}" />`,
          `<link rel="canonical" href="${url}" />`,
          `<meta property="og:type" content="profile" />`,
          `<meta property="og:site_name" content="FACS" />`,
          `<meta property="og:title" content="${escHtml(title)}" />`,
          `<meta property="og:description" content="${escHtml(description)}" />`,
          `<meta property="og:url" content="${url}" />`,
          `<meta property="og:image" content="${image}" />`,
          `<meta property="og:image:width" content="640" />`,
          `<meta property="og:image:height" content="640" />`,
          `<meta name="twitter:card" content="summary" />`,
        ].join('\n    ')
        const html = shell
          .replace(/\s*<title>[\s\S]*?<\/title>/, '')
          .replace(/\s*<meta name="description"[^>]*>/, '')
          .replace(/\s*<meta property="og:[^>]*>/g, '')
          .replace('</head>', `    ${meta}\n  </head>`)
        writeFileSync(resolve(dir, 'index.html'), html)

        const photoPath = resolve('public', 'card', `${p.slug}.jpg`)
        const photo = existsSync(photoPath) ? readFileSync(photoPath).toString('base64') : ''
        writeFileSync(resolve(dir, 'contact.vcf'), buildVCard(p, 'vi', photo))
        writeFileSync(resolve(dir, 'contact-en.vcf'), buildVCard(p, 'en', photo))
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    digitalCardPages(),
  ],
})
