import net from 'node:net';

// IPv6: một người dùng thường có cả dải /64, nên gộp theo /64 để đổi địa chỉ trong dải không né được giới hạn theo IP.
// IPv4 và địa chỉ IPv4-mapped (::ffff:a.b.c.d) giữ nguyên dạng IPv4.
export function normIp(ip) {
  if (typeof ip !== 'string') return 'unknown';
  const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (m) return m[1];
  if (net.isIPv6(ip.split('%')[0])) {
    const [head, tail = ''] = ip.split('%')[0].split('::');
    const a = head ? head.split(':') : [];
    const b = tail ? tail.split(':') : [];
    const full = [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b];
    return full.slice(0, 4).map((g) => (parseInt(g || '0', 16) || 0).toString(16)).join(':') + '::/64';
  }
  return ip;
}
