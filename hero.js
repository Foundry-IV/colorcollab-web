const pages = [
  {
    title: 'Cloud Charm',
    artist: 'Chris Núñez',
    outline: 'art/chris/cloud-charm-outline.png',
    regions: 'art/chris/cloud-charm-regions.png',
  },
  {
    title: 'Eagle',
    artist: 'Tim Hendricks',
    outline: 'art/hendricks/eagle-outline.png',
    regions: 'art/hendricks/eagle-regions.png',
  },
]

const palette = [
  [142, 42, 36],
  [184, 146, 78],
  [36, 74, 56],
  [110, 36, 48],
  [92, 58, 36],
]
const paper = [239, 228, 210]

const canvas = document.querySelector('#hero-canvas')
const ctx = canvas.getContext('2d')
const sheet = document.createElement('canvas')
const sheetCtx = sheet.getContext('2d', { willReadFrequently: true })
const caption = document.querySelector('#hero-caption')
const copy = document.querySelector('.film-copy')
const film = document.querySelector('.film')
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(src))
    image.src = src
  })
}

function collect(regionImage) {
  const sample = document.createElement('canvas')
  sample.width = regionImage.width
  sample.height = regionImage.height
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true })
  sampleCtx.drawImage(regionImage, 0, 0)
  const data = sampleCtx.getImageData(0, 0, sample.width, sample.height).data
  const groups = new Map()
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r > 232 && g > 226 && b > 214) continue
    if (r < 32 && g < 32 && b < 32) continue
    const key = (r << 16) | (g << 8) | b
    let list = groups.get(key)
    if (!list) {
      list = []
      groups.set(key, list)
    }
    list.push(i / 4)
  }
  const ranked = [...groups.values()].filter((list) => list.length > 50).sort((a, b) => b.length - a.length)
  const total = ranked.reduce((sum, list) => sum + list.length, 0)
  const motifs = ranked.filter((list, index) => index > 0 || list.length < total * 0.34)
  return motifs.slice(0, 18)
}

async function prepare(page) {
  const [regions, outline] = await Promise.all([loadImage(page.regions), loadImage(page.outline)])
  const groups = collect(regions)
  const total = groups.reduce((sum, group) => sum + group.length, 0)
  const buffer = sheetCtx.createImageData(regions.width, regions.height)
  return { ...page, regions, outline, groups, total, buffer }
}

let prepared = []
let lastKey = ''

function render(progress) {
  if (!prepared.length) return
  const span = prepared.length
  const scaled = Math.min(0.999, Math.max(0, progress)) * span
  const pageIndex = Math.min(span - 1, Math.floor(scaled))
  const local = scaled - pageIndex
  const page = prepared[pageIndex]
  const count = reduce ? page.total : Math.floor(local * page.total)
  const key = `${pageIndex}:${count}:${canvas.clientWidth}x${canvas.clientHeight}`
  if (key === lastKey) {
    fadeCopy(progress)
    return
  }
  lastKey = key
  const { width, height } = page.regions
  if (sheet.width !== width) sheet.width = width
  if (sheet.height !== height) sheet.height = height
  const data = page.buffer.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = paper[0]
    data[i + 1] = paper[1]
    data[i + 2] = paper[2]
    data[i + 3] = 255
  }
  let seen = 0
  for (let g = 0; g < page.groups.length; g += 1) {
    const group = page.groups[g]
    const color = palette[g % palette.length]
    const take = Math.max(0, Math.min(group.length, count - seen))
    for (let n = 0; n < take; n += 1) {
      const offset = group[n] * 4
      data[offset] = color[0]
      data[offset + 1] = color[1]
      data[offset + 2] = color[2]
    }
    seen += group.length
    if (seen >= count) break
  }
  sheetCtx.putImageData(page.buffer, 0, 0)
  sheetCtx.drawImage(page.outline, 0, 0, width, height)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const viewW = canvas.clientWidth
  const viewH = canvas.clientHeight
  canvas.width = Math.max(1, Math.floor(viewW * dpr))
  canvas.height = Math.max(1, Math.floor(viewH * dpr))
  const scale = Math.max(viewW / width, viewH / height)
  const dw = width * scale
  const dh = height * scale
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#090908'
  ctx.fillRect(0, 0, viewW, viewH)
  ctx.drawImage(sheet, (viewW - dw) / 2, (viewH - dh) / 2, dw, dh)
  caption.textContent = `${page.title} · ${page.artist}`
  fadeCopy(progress)
}

function fadeCopy(progress) {
  const opacity = Math.max(0, 1 - progress / 0.16)
  copy.style.opacity = String(opacity)
}

function progress() {
  const rect = film.getBoundingClientRect()
  const total = film.offsetHeight - window.innerHeight
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, -rect.top / total))
}

let frame = 0
function onScroll() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    render(progress())
  })
}

async function start() {
  prepared = []
  for (const page of pages) prepared.push(await prepare(page))
  render(reduce ? 1 : progress())
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
}

void start()
