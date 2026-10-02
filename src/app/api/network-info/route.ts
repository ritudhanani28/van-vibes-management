import { NextResponse } from 'next/server';
import os from 'os';

export function getLanIpv4(): string | null {
  // 1. Allow explicit environment variable override
  const envOverride = process.env.HOST_LAN_IP || process.env.LAN_IP;
  if (envOverride && !envOverride.startsWith('127.')) {
    return envOverride.trim();
  }

  // 2. Inspect active network interfaces
  const interfaces = os.networkInterfaces();
  const candidates: { address: string; priority: number }[] = [];

  for (const [name, ifaces] of Object.entries(interfaces)) {
    if (!ifaces) continue;
    const lowerName = name.toLowerCase();

    // Skip virtual, docker, bridge, vpn, or loopback interfaces
    const isVirtual =
      lowerName.includes('docker') ||
      lowerName.includes('veth') ||
      lowerName.includes('br-') ||
      lowerName.includes('vmnet') ||
      lowerName.includes('vbox') ||
      lowerName.includes('utun') ||
      lowerName.includes('tun') ||
      lowerName.includes('tap');

    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const addr = iface.address;
        if (addr.startsWith('127.') || addr.startsWith('169.254.')) {
          continue;
        }

        let priority = 100;
        if (isVirtual) {
          priority += 50;
        }

        // Real physical Wi-Fi and Ethernet interfaces get highest priority
        if (
          lowerName.startsWith('en') ||
          lowerName.startsWith('eth') ||
          lowerName.startsWith('wlan') ||
          lowerName.startsWith('wl') ||
          lowerName.includes('wi-fi') ||
          lowerName.includes('ethernet')
        ) {
          priority -= 40;
        }

        // Standard home/office LAN subnets
        if (addr.startsWith('192.168.')) {
          priority -= 20;
        } else if (addr.startsWith('10.')) {
          priority -= 15;
        } else if (addr.startsWith('172.16.') || addr.startsWith('172.17.') || addr.startsWith('172.18.') || addr.startsWith('172.19.') || addr.startsWith('172.2') || addr.startsWith('172.3')) {
          priority -= 10;
        }

        candidates.push({ address: addr, priority });
      }
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.length > 0 ? candidates[0].address : null;
}

export async function GET() {
  const lanIp = getLanIpv4();
  const configuredCustomerUrl =
    process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_FRONTEND_URL ||
    process.env.CUSTOMER_FRONTEND_URL ||
    '';

  const customerPort = parseInt(
    process.env.NEXT_PUBLIC_CUSTOMER_PORT || process.env.CUSTOMER_PORT || '4000',
    10
  );

  return NextResponse.json({
    lanIp,
    customerPort,
    configuredUrl: configuredCustomerUrl.trim() || null,
  });
}
