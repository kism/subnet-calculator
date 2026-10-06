import '@fontsource/dejavu-mono/400.css'
import '@fontsource/dejavu-mono/700.css'
import 'classic-stylesheets/layout.css'
import 'classic-stylesheets/themes/cde/theme.css'
import './style.css'
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
      row.append(panel('lowered padding', key), panel('lowered padding grow', value))
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

function update(): void {
  render(rows())
}

ipInput.addEventListener('input', update)
prefixSlider.addEventListener('focus', () => setActive(false))
prefixSlider.addEventListener('input', () => setActive(false))
maskInput.addEventListener('focus', () => setActive(true))
maskInput.addEventListener('input', () => setActive(true))
update()
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

let fontSize = 12
function zoom(size: number): void {
  fontSize = Math.min(32, Math.max(8, size))
  document.body.style.fontSize = `${fontSize}px`
  setCookie('zoom', fontSize)
}
$('smaller').addEventListener('click', () => zoom(fontSize - 2))
$('bigger').addEventListener('click', () => zoom(fontSize + 2))
$('reset').addEventListener('click', () => zoom(12))
zoom(Number(getCookie('zoom') ?? 12))

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
const windowEl = document.querySelector('main') as HTMLElement
let activeTimer = 0

let skinIndex = defaultSkin
function setSkin(index: number): void {
  skinIndex = (index + skinNames.length) % skinNames.length
  skinStyle.textContent = skinCss[skinIndex]
  skinButton.textContent = skinNames[skinIndex]
  setCookie('skin', skinNames[skinIndex])
  // Show the window's focused look briefly so the skin's active colours are visible too
  windowEl.classList.add('active')
  clearTimeout(activeTimer)
  activeTimer = window.setTimeout(() => windowEl.classList.remove('active'), 1000)
}
$('prev-skin').addEventListener('click', () => setSkin(skinIndex - 1))
$('next-skin').addEventListener('click', () => setSkin(skinIndex + 1))
skinButton.addEventListener('click', () => setSkin(defaultSkin))
const savedSkin = skinNames.indexOf(getCookie('skin') ?? '')
setSkin(savedSkin === -1 ? defaultSkin : savedSkin)
