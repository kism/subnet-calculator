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

/** Accepts "24", "/24" or "255.255.255.0". */
export function parsePrefix(s: string): number | null {
  const t = s.trim().replace(/^\//, '')
  if (/^\d{1,2}$/.test(t)) return Number(t) <= 32 ? Number(t) : null
  return maskToPrefix(t)
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
