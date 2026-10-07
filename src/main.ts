import 'classic-stylesheets/layout.css'
import 'classic-stylesheets/themes/cde/theme.css'
import './fonts.css'
import './style.css'
import './bitmapText'
import { calculate, formatIp, maskToPrefix, parseIp, parsePrefix, prefixToMask } from './subnet'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const ipInput = $<HTMLInputElement>('ip')
const prefixSlider = $<HTMLInputElement>('prefix')
const prefixOut = $<HTMLOutputElement>('prefix-out')
const maskInput = $<HTMLInputElement>('mask')
const info = $<HTMLDivElement>('info')

maskInput.value = '255.255.255.0'

let maskActive = false

function setActive(useMask: boolean): void {
  maskActive = useMask
  update()
}

function panel(className: string, text: string): HTMLDivElement {
  const div = document.createElement('div')
  div.className = className
  div.textContent = text
  return div
}

function render(data: [string, string][]): void {
  info.textContent = ''
  info.append(
    ...data.map(([key, value]) => {
      const row = panel(key === 'Error' ? 'flex-row error' : 'flex-row', '')
      const valuePanel = panel('lowered padding grow', '')
      // On narrow phones, wrap before a slash or after a dot rather than mid-octet; unlike a zero-width space,
      // <wbr> isn't copied
      for (const part of value.split(/([./])/)) {
        if (part === '/') valuePanel.append(document.createElement('wbr'))
        valuePanel.append(part)
        if (part === '.') valuePanel.append(document.createElement('wbr'))
      }
      row.append(panel('lowered padding', key), valuePanel)
      return row
    }),
  )
}

// Keep the inactive box in step with the active one (or both with a /suffix)
function syncMasks(prefix: number): void {
  prefixSlider.value = String(prefix)
  prefixOut.textContent = `/${prefix}`
  if (maskToPrefix(maskInput.value) !== prefix) maskInput.value = formatIp(prefixToMask(prefix))
}

function rows(): [string, string][] {
  const value = ipInput.value.trim()
  const slash = value.indexOf('/')
  prefixSlider.disabled = maskInput.disabled = slash !== -1

  const prefix =
    slash !== -1
      ? parsePrefix(value.slice(slash + 1))
      : maskActive
        ? maskToPrefix(maskInput.value)
        : Number(prefixSlider.value)
  if (prefix !== null) syncMasks(prefix)

  if (value === '') return [['Error', 'Enter IP address']]
  const ip = parseIp(slash === -1 ? value : value.slice(0, slash))
  if (ip === null) return [['Error', 'Invalid IP address']]
  if (prefix === null) return [['Error', 'Invalid netmask']]

  const info = calculate(ip, prefix)
  return [
    ['Address', `${info.address}/${info.prefix}`],
    ['Netmask', info.netmask],
    ['Wildcard', info.wildcard],
    ['Network', `${info.network}/${info.prefix}`],
    ['Broadcast', info.broadcast],
    ['HostMin', info.hostMin],
    ['HostMax', info.hostMax],
    ['Hosts', info.hosts.toLocaleString()],
  ]
}

let saveTimer = 0
function update(): void {
  const data = rows()
  render(data)
  // Remember the last valid IP once it has stayed valid for a second. Valid input is only digits, dots, a slash
  // and spaces, so dropping the spaces makes it cookie-safe
  clearTimeout(saveTimer)
  if (data[0][0] !== 'Error')
    saveTimer = window.setTimeout(() => setCookie('ip', ipInput.value.replace(/\s/g, '')), 1000)
}

ipInput.addEventListener('input', update)
prefixSlider.addEventListener('focus', () => setActive(false))
prefixSlider.addEventListener('input', () => setActive(false))
maskInput.addEventListener('focus', () => setActive(true))
maskInput.addEventListener('input', () => setActive(true))
if (!ipInput.value) ipInput.value = getCookie('ip') ?? ''
update()
// Phones (same breakpoint as style.css) keep the calculator styled as focused unless Settings was the last window
// used. Taps are tracked as well as focus because iOS doesn't focus a tapped button.
const phone = matchMedia('(max-width: 600px)')
const mainEl = document.querySelector('main') as HTMLElement
const controls = $('controls')
let settingsActive = false
function keepActive(): void {
  mainEl.classList.toggle('active', phone.matches && !settingsActive)
  controls.classList.toggle('active', phone.matches && settingsActive)
}
function trackWindow(e: Event): void {
  settingsActive = controls.contains(e.target as Node)
  // Otherwise a focused input keeps the calculator lit through the theme's :focus-within
  if (
    settingsActive &&
    phone.matches &&
    document.activeElement instanceof HTMLElement &&
    mainEl.contains(document.activeElement)
  )
    document.activeElement.blur()
  keepActive()
}
document.addEventListener('mousedown', trackWindow)
document.addEventListener('focusin', trackWindow)
keepActive()
// addListener rather than addEventListener: MediaQueryList only got EventTarget in Safari 14
phone.addListener(keepActive)
// Focus the IP box and select any text the browser restored (refresh/back)
ipInput.select()
document.addEventListener('keydown', (e) => {
  // Leave Enter on the buttons alone so it still presses them
  if (e.key === 'Escape' || (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement))) ipInput.select()
})

function getCookie(name: string): string | undefined {
  return new RegExp(`(?:^|; )${name}=([^;]*)`).exec(document.cookie)?.[1]
}

function setCookie(name: string, value: string | number): void {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is too new for the es2015 target
  document.cookie = `${name}=${value}; max-age=31536000; path=/; SameSite=Lax`
}

// Centring main in an odd-width body puts it on a half pixel, which blurs every glyph of the pixel font, so keep the
// body an even number of pixels wide. Rerun when the viewport or the em-sized body margin changes
function evenBodyWidth(): void {
  document.body.style.width = ''
  document.body.style.width = `${document.body.clientWidth & ~1}px`
}
addEventListener('resize', evenBodyWidth)

// Each has a "Lucida Sans <size>" family in fonts.css: an original 10/12/14/18px bitmap or one doubled. bitmapText.ts
// snaps every glyph to whole pixels, so these all stay sharp; 8 was too small and 16 (8px doubled) too blocky
const ZOOM_LEVELS = [10, 12, 14, 18, 20, 24, 28, 36]
let zoomIndex = ZOOM_LEVELS.indexOf(12)
function zoom(index: number): void {
  zoomIndex = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, index))
  const size = ZOOM_LEVELS[zoomIndex]
  document.body.style.font = `${size}px "Lucida Sans ${size}", sans-serif`
  setCookie('zoom', size)
  evenBodyWidth()
}
$('smaller').addEventListener('click', () => zoom(zoomIndex - 1))
$('bigger').addEventListener('click', () => zoom(zoomIndex + 1))
$('reset').addEventListener('click', () => zoom(ZOOM_LEVELS.indexOf(12)))
// A saved size from before the levels changed (e.g. 22) snaps to the next level down
const savedZoom = Number(getCookie('zoom')) || 12
zoom(ZOOM_LEVELS.filter((size) => size <= savedZoom).length - 1)

// Browser zoom gives a fractional pixel ratio, where the bitmap glyphs can't keep even pixels, so on desktop its
// shortcuts drive the page's own levels instead. The View menu's zoom can't be intercepted; bitmapText copes with it
addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || phone.matches) return
  const step = e.key === '=' || e.key === '+' ? 1 : e.key === '-' ? -1 : e.key === '0' ? 0 : null
  if (step === null) return
  e.preventDefault()
  zoom(step ? zoomIndex + step : ZOOM_LEVELS.indexOf(12))
})
// Trackpad pinch arrives as ctrl+wheel in Chrome and Firefox: one level per 50px of pinch
let pinch = 0
addEventListener(
  'wheel',
  (e) => {
    if (!e.ctrlKey || phone.matches) return
    e.preventDefault()
    pinch -= e.deltaY
    if (Math.abs(pinch) < 50) return
    zoom(zoomIndex + Math.sign(pinch))
    pinch = 0
  },
  { passive: false },
)
// ...and as gesture events in Safari, with the scale since the pinch began: one level per √2
let gestureStart = 0
addEventListener('gesturestart', (e) => {
  if (phone.matches) return
  e.preventDefault()
  gestureStart = zoomIndex
})
addEventListener('gesturechange', (e) => {
  if (phone.matches) return
  e.preventDefault()
  zoom(gestureStart + Math.round(Math.log2((e as Event & { scale: number }).scale) * 2))
})

// All CDE skins are bundled (~9 kB gzipped); the chosen one is swapped into a <style>
const skinFiles = import.meta.glob<string>('/node_modules/classic-stylesheets/themes/cde/skins/*.css', {
  query: '?inline',
  import: 'default',
  eager: true,
})
const skinNames = Object.keys(skinFiles).map((path) => path.slice(path.lastIndexOf('/') + 1, -'.css'.length))
const skinCss = Object.keys(skinFiles).map((path) => skinFiles[path])
const defaultSkin = skinNames.indexOf('crimson-4')
const skinStyle = document.head.appendChild(document.createElement('style'))
const skinButton = $<HTMLButtonElement>('skin')
let activeTimer = 0

let skinIndex = defaultSkin
function setSkin(index: number): void {
  skinIndex = (index + skinNames.length) % skinNames.length
  skinStyle.textContent = skinCss[skinIndex]
  skinButton.textContent = skinNames[skinIndex]
  setCookie('skin', skinNames[skinIndex])
  // Show the window's focused look briefly so the skin's active colours are visible too. Not on phones,
  // where Settings is already styled as focused while you pick a skin
  if (!phone.matches) mainEl.classList.add('active')
  clearTimeout(activeTimer)
  activeTimer = window.setTimeout(keepActive, 1000)
}
$('prev-skin').addEventListener('click', () => setSkin(skinIndex - 1))
$('next-skin').addEventListener('click', () => setSkin(skinIndex + 1))
skinButton.addEventListener('click', () => setSkin(defaultSkin))
const savedSkin = skinNames.indexOf(getCookie('skin') ?? '')
setSkin(savedSkin === -1 ? defaultSkin : savedSkin)
