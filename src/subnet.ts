export interface SubnetInfo {
  address: string
  netmask: string
  wildcard: string
  network: string
  broadcast: string
  hostMin: string
  hostMax: string
  hosts: number
  prefix: number
}

export function parseIp(s: string): number | null {
  const parts = s.trim().split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null
    n = n * 256 + Number(p)
  }
  return n
}

export function formatIp(n: number): string {
  return [24, 16, 8, 0].map((shift) => (n >>> shift) & 255).join('.')
}

export function prefixToMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
}

export function maskToPrefix(s: string): number | null {
  const mask = parseIp(s)
  if (mask === null) return null
  const wildcard = ~mask >>> 0
  // Contiguous masks have a wildcard of the form 0..01..1
  if ((wildcard & (wildcard + 1)) !== 0) return null
  return Math.clz32(wildcard)
}

/** Accepts "24", "/24" or "255.255.255.0" (or an IPv6 mask with v6). */
export function parsePrefix(s: string, v6 = false): number | null {
  const t = s.trim().replace(/^\//, '')
  if (/^\d{1,3}$/.test(t)) return Number(t) <= (v6 ? 128 : 32) ? Number(t) : null
  return v6 ? maskToPrefix6(t) : maskToPrefix(t)
}

export function calculate(ip: number, prefix: number): SubnetInfo {
  const mask = prefixToMask(prefix)
  const network = (ip & mask) >>> 0
  const broadcast = (network | ~mask) >>> 0
  // /31 (RFC 3021) and /32 have no network/broadcast reservation
  const pointToPoint = prefix >= 31
  return {
    address: formatIp(ip),
    netmask: formatIp(mask),
    wildcard: formatIp(~mask),
    network: formatIp(network),
    broadcast: formatIp(broadcast),
    hostMin: formatIp(pointToPoint ? network : network + 1),
    hostMax: formatIp(pointToPoint ? broadcast : broadcast - 1),
    hosts: pointToPoint ? 2 ** (32 - prefix) : 2 ** (32 - prefix) - 2,
    prefix,
  }
}

// IPv6 addresses are eight 16-bit hextets; BigInt is too new for the oldest supported browsers
export type Ip6 = number[]

export type Subnet6Info = Omit<SubnetInfo, 'broadcast'>

/** Accepts the usual forms: full, "::"-compressed and with a dotted IPv4 tail (::ffff:1.2.3.4). */
export function parseIp6(s: string): Ip6 | null {
  let t = s.trim()
  const colon = t.lastIndexOf(':')
  if (t.indexOf('.', colon) !== -1) {
    const v4 = parseIp(t.slice(colon + 1))
    if (v4 === null) return null
    t = `${t.slice(0, colon + 1)}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`
  }
  const halves = t.split('::')
  if (halves.length > 2) return null
  const groups = (half: string) => (half === '' ? [] : half.split(':'))
  const head = groups(halves[0])
  const tail = halves.length === 2 ? groups(halves[1]) : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null
  const parts = [...head, ...Array(missing).fill('0'), ...tail]
  if (!parts.every((p) => /^[0-9a-f]{1,4}$/i.test(p))) return null
  return parts.map((p) => parseInt(p, 16))
}

/** RFC 5952: IPv4-mapped in dotted form, otherwise lowercase, no leading zeros, and the longest (then first) run of two or more zero hextets as "::". */
export function formatIp6(ip: Ip6): string {
  // IPv4-mapped addresses keep the IPv4 dotted (RFC 5952 section 5)
  if (ip.slice(0, 6).join() === '0,0,0,0,0,65535') return `::ffff:${formatIp(ip[6] * 0x10000 + ip[7])}`
  let start = -1
  let length = 1
  for (let i = 0; i < 8; i++) {
    let j = i
    while (j < 8 && ip[j] === 0) j++
    if (j - i > length) [start, length] = [i, j - i]
    i = j
  }
  const hex = ip.map((h) => h.toString(16))
  if (start === -1) return hex.join(':')
  return `${hex.slice(0, start).join(':')}::${hex.slice(start + length).join(':')}`
}

export function prefixToMask6(prefix: number): Ip6 {
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const bits = Math.min(16, Math.max(0, prefix - 16 * i))
    return (0xffff << (16 - bits)) & 0xffff
  })
}

export function maskToPrefix6(s: string): number | null {
  const mask = parseIp6(s)
  if (mask === null) return null
  // Count the set bits, then check they're all at the front
  const prefix = mask.reduce((n, h) => n + h.toString(2).replace(/0/g, '').length, 0)
  return prefixToMask6(prefix).every((h, i) => h === mask[i]) ? prefix : null
}

/** Like calculate(), but IPv6 has no broadcast, so every address is a host (as in ipcalc). */
export function calculate6(ip: Ip6, prefix: number): Subnet6Info {
  const mask = prefixToMask6(prefix)
  return {
    address: formatIp6(ip),
    netmask: formatIp6(mask),
    wildcard: formatIp6(mask.map((h) => h ^ 0xffff)),
    network: formatIp6(ip.map((h, i) => h & mask[i])),
    hostMin: formatIp6(ip.map((h, i) => h & mask[i])),
    hostMax: formatIp6(ip.map((h, i) => h | (mask[i] ^ 0xffff))),
    hosts: 2 ** (128 - prefix),
    prefix,
  }
}
