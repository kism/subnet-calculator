import { describe, expect, it } from 'vitest'
import { calculate, formatIp, maskToPrefix, parseIp, parsePrefix, prefixToMask } from '../src/subnet'

describe('parseIp', () => {
  it('parses valid addresses', () => {
    expect(parseIp('0.0.0.0')).toBe(0)
    expect(parseIp('255.255.255.255')).toBe(0xffffffff)
    expect(parseIp(' 192.168.1.10 ')).toBe(0xc0a8010a)
  })

  it('rejects junk', () => {
    for (const bad of ['', '1.2.3', '1.2.3.4.5', '256.0.0.1', '1.2.3.a', '1..2.3', '1.2.3.-1', '1.2.3.1000']) {
      expect(parseIp(bad)).toBeNull()
    }
  })

  it('round-trips with formatIp', () => {
    expect(formatIp(parseIp('10.20.30.40') as number)).toBe('10.20.30.40')
  })
})

describe('masks', () => {
  it('converts prefix to mask', () => {
    expect(formatIp(prefixToMask(0))).toBe('0.0.0.0')
    expect(formatIp(prefixToMask(24))).toBe('255.255.255.0')
    expect(formatIp(prefixToMask(32))).toBe('255.255.255.255')
  })

  it('converts mask to prefix for every prefix', () => {
    for (let p = 0; p <= 32; p++) expect(maskToPrefix(formatIp(prefixToMask(p)))).toBe(p)
  })

  it('rejects non-contiguous masks', () => {
    expect(maskToPrefix('255.0.255.0')).toBeNull()
    expect(maskToPrefix('0.255.255.255')).toBeNull()
  })

  it('parses prefix suffixes in either form', () => {
    expect(parsePrefix('24')).toBe(24)
    expect(parsePrefix('/8')).toBe(8)
    expect(parsePrefix('255.255.0.0')).toBe(16)
    expect(parsePrefix('33')).toBeNull()
    expect(parsePrefix('')).toBeNull()
  })
})

describe('calculate', () => {
  it('handles a /24', () => {
    expect(calculate(parseIp('192.168.1.10') as number, 24)).toEqual({
      address: '192.168.1.10',
      netmask: '255.255.255.0',
      wildcard: '0.0.0.255',
      network: '192.168.1.0',
      broadcast: '192.168.1.255',
      hostMin: '192.168.1.1',
      hostMax: '192.168.1.254',
      hosts: 254,
      prefix: 24,
    })
  })

  it('handles /31 and /32', () => {
    const p31 = calculate(parseIp('10.0.0.1') as number, 31)
    expect([p31.hostMin, p31.hostMax, p31.hosts]).toEqual(['10.0.0.0', '10.0.0.1', 2])
    const p32 = calculate(parseIp('10.0.0.1') as number, 32)
    expect([p32.network, p32.broadcast, p32.hosts]).toEqual(['10.0.0.1', '10.0.0.1', 1])
  })

  it('handles /0', () => {
    const p0 = calculate(parseIp('8.8.8.8') as number, 0)
    expect([p0.network, p0.broadcast, p0.hosts]).toEqual(['0.0.0.0', '255.255.255.255', 2 ** 32 - 2])
  })
})
