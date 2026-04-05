import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import type { Configs } from '@/shared/models/config';
import type { VideoChatMessage } from '@/shared/types/video-analysis';

export const VIDEO_CHAT_LIMITS = {
  maxMessages: 20,
  maxMessageChars: 4000,
  maxTotalChars: 20000,
} as const;

const SAFE_PROXY_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-disposition',
  'content-length',
  'content-type',
  'etag',
  'last-modified',
] as const;

const IPV4_PRIVATE_RANGES: Array<[number, number]> = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x64400000, 0x647fffff], // 100.64.0.0/10
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0000000, 0xc00000ff], // 192.0.0.0/24
  [0xc0000200, 0xc00002ff], // 192.0.2.0/24
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0xc6120000, 0xc613ffff], // 198.18.0.0/15
  [0xc6336400, 0xc63364ff], // 198.51.100.0/24
  [0xcb007100, 0xcb0071ff], // 203.0.113.0/24
  [0xe0000000, 0xefffffff], // 224.0.0.0/4
  [0xf0000000, 0xffffffff], // 240.0.0.0/4
] as const;

function ipv4ToInt(value: string) {
  const parts = value.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const num = Number(part);
    if (!Number.isInteger(num) || num < 0 || num > 255) {
      return null;
    }
    result = (result << 8) + num;
  }

  return result >>> 0;
}

function isPrivateOrReservedIpv4(value: string) {
  const ip = ipv4ToInt(value);
  if (ip === null) return true;

  return IPV4_PRIVATE_RANGES.some(([start, end]) => ip >= start && ip <= end);
}

function isPrivateOrReservedIpv6(value: string) {
  const normalized = value.toLowerCase().split('%')[0];

  if (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff') ||
    normalized.startsWith('2001:db8')
  ) {
    return true;
  }

  if (!normalized.startsWith('::ffff:')) {
    return false;
  }

  const embedded = normalized.slice('::ffff:'.length);
  return isIP(embedded) === 4 ? isPrivateOrReservedIpv4(embedded) : false;
}

function isPrivateOrReservedIp(value: string) {
  const version = isIP(value);
  if (version === 4) return isPrivateOrReservedIpv4(value);
  if (version === 6) return isPrivateOrReservedIpv6(value);
  return false;
}

function normalizeHostname(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

function extractHostname(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';

  try {
    return normalizeHostname(new URL(normalized).hostname);
  } catch {
    return normalizeHostname(normalized.replace(/^https?:\/\//i, ''));
  }
}

function parseAllowedHosts(value: string) {
  return String(value || '')
    .split(/[\s,]+/)
    .map((item) => extractHostname(item))
    .filter(Boolean);
}

function isHostnameAllowed(hostname: string, allowedHosts: string[]) {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;

  return allowedHosts.some((candidate) => {
    const allowed = normalizeHostname(candidate);
    if (!allowed) return false;
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1);
      return normalized.endsWith(suffix) && normalized !== allowed.slice(2);
    }
    return normalized === allowed;
  });
}

export function buildProxyAllowedHosts(configs: Configs) {
  const values = [
    configs.proxy_file_allowed_hosts,
    configs.r2_domain,
    configs.s3_domain,
  ];

  return [...new Set(values.flatMap((value) => parseAllowedHosts(value || '')))];
}

export function copySafeProxyResponseHeaders(source: Headers) {
  const target = new Headers();

  for (const name of SAFE_PROXY_RESPONSE_HEADERS) {
    const value = source.get(name);
    if (value) {
      target.set(name, value);
    }
  }

  return target;
}

export async function validateProxyTarget(
  rawUrl: string,
  allowedHosts: string[]
): Promise<URL | null> {
  if (!allowedHosts.length) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    return null;
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname || isIP(hostname)) {
    return null;
  }

  if (!isHostnameAllowed(hostname, allowedHosts)) {
    return null;
  }

  try {
    const resolved = await lookup(hostname, { all: true, verbatim: true });
    if (!resolved.length) {
      return null;
    }

    if (resolved.some((item) => isPrivateOrReservedIp(item.address))) {
      return null;
    }
  } catch {
    return null;
  }

  return parsed;
}

export function validateVideoChatMessages(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'analysisId and messages are required';
  }

  if (messages.length > VIDEO_CHAT_LIMITS.maxMessages) {
    return `messages must contain at most ${VIDEO_CHAT_LIMITS.maxMessages} items`;
  }

  let totalChars = 0;

  for (const [index, message] of messages.entries()) {
    const item = message as Partial<VideoChatMessage> | null;
    if (!item || typeof item !== 'object') {
      return `message ${index + 1} is invalid`;
    }

    if (
      item.role !== 'user' &&
      item.role !== 'assistant' &&
      item.role !== 'system'
    ) {
      return `message ${index + 1} role is invalid`;
    }

    if (typeof item.content !== 'string') {
      return `message ${index + 1} content is invalid`;
    }

    const length = item.content.length;
    if (length === 0) {
      return `message ${index + 1} content is required`;
    }

    if (length > VIDEO_CHAT_LIMITS.maxMessageChars) {
      return `message ${index + 1} exceeds ${VIDEO_CHAT_LIMITS.maxMessageChars} characters`;
    }

    totalChars += length;
  }

  if (totalChars > VIDEO_CHAT_LIMITS.maxTotalChars) {
    return `messages exceed ${VIDEO_CHAT_LIMITS.maxTotalChars} characters in total`;
  }

  return null;
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
