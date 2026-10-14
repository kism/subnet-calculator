#!/usr/bin/env python3
"""Generate cases.json: reference subnet results from Python's ipaddress, used by tests/reference.test.ts."""

import hashlib
import ipaddress
import json
import random
from pathlib import Path

cases = []
for _ in range(20000):
    ip = random.getrandbits(32)
    prefix = random.randint(0, 32)
    net = ipaddress.IPv4Network((ip, prefix), strict=False)
    # hosts() is independent of our /31 /32 handling, but too slow to list on big networks
    hosts = list(net.hosts()) if prefix >= 24 else [net.network_address + 1, net.broadcast_address - 1]
    cases.append(
        {
            "ip": ip,
            "prefix": prefix,
            "address": str(ipaddress.IPv4Address(ip)),
            "netmask": str(net.netmask),
            "wildcard": str(net.hostmask),
            "network": str(net.network_address),
            "broadcast": str(net.broadcast_address),
            "hostMin": str(hosts[0]),
            "hostMax": str(hosts[-1]),
            "hosts": net.num_addresses if prefix >= 31 else net.num_addresses - 2,
        }
    )

# IPv6, with runs of zero hextets so "::" compression gets exercised. No broadcast, and every address is a host
for _ in range(20000):
    ip = sum(random.choice([0, random.getrandbits(16)]) << (16 * i) for i in range(8))
    prefix = random.randint(0, 128)
    net = ipaddress.IPv6Network((ip, prefix), strict=False)
    cases.append(
        {
            "ip": str(ipaddress.IPv6Address(ip)),
            "prefix": prefix,
            "address": str(ipaddress.IPv6Address(ip)),
            "netmask": str(net.netmask),
            "wildcard": str(net.hostmask),
            "network": str(net.network_address),
            "hostMin": str(net.network_address),
            "hostMax": str(net.broadcast_address),
            "hosts": net.num_addresses,
        }
    )

out = Path(__file__).resolve().parent.parent.joinpath("tests", "cases.json")
data = json.dumps(cases).encode()
out.write_bytes(data)
print(f"{out.name}: {len(cases)} cases, {len(data)} bytes, sha256 {hashlib.sha256(data).hexdigest()}")
