import '@fontsource/fira-code/400.css'
import './style.css'
import { calculate, formatIp, maskToPrefix, parseIp, parsePrefix, prefixToMask } from './subnet'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const ipInput = $<HTMLInputElement>('ip')
const masks = $<HTMLDivElement>('masks')
const prefixSelect = $<HTMLSelectElement>('prefix')
const maskInput = $<HTMLInputElement>('mask')
const prefixBox = $<HTMLLabelElement>('prefix-box')
const maskBox = $<HTMLLabelElement>('mask-box')
const table = $<HTMLTableElement>('info')

for (let p = 32; p >= 0; p--) prefixSelect.add(new Option(`/${p}  ${formatIp(prefixToMask(p))}`, String(p)))
prefixSelect.value = '24'

let maskActive = false

function setActive(useMask: boolean): void {
  maskActive = useMask
  maskBox.classList.toggle('active', useMask)
  prefixBox.classList.toggle('active', !useMask)
  update()
}

function render(data: [string, string][]): void {
  table.replaceChildren(
    ...data.map(([key, value]) => {
      const tr = document.createElement('tr')
      tr.insertCell().textContent = key
      tr.insertCell().textContent = value
      return tr
    }),
  )
}

function rows(): [string, string][] {
  const value = ipInput.value.trim()
  const slash = value.indexOf('/')
  masks.hidden = slash !== -1 || value === ''
  if (value === '') return []

  const ip = parseIp(slash === -1 ? value : value.slice(0, slash))
  if (ip === null) return [['Error', 'Invalid IP address']]

  const prefix =
    slash !== -1
      ? parsePrefix(value.slice(slash + 1))
      : maskActive
        ? maskToPrefix(maskInput.value)
        : Number(prefixSelect.value)
  if (prefix === null) return [['Error', 'Invalid netmask']]

  const info = calculate(ip, prefix)
  return [
    ['Address', info.address],
    ['Netmask', `${info.netmask} = /${info.prefix}`],
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
prefixSelect.addEventListener('focus', () => setActive(false))
prefixSelect.addEventListener('change', () => setActive(false))
maskInput.addEventListener('focus', () => setActive(true))
maskInput.addEventListener('input', () => setActive(true))
update()
