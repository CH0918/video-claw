import { NextRequest, NextResponse } from 'next/server';

import {
  buildProxyAllowedHosts,
  copySafeProxyResponseHeaders,
  validateProxyTarget,
} from '@/shared/lib/api-security';
import { getAllConfigs } from '@/shared/models/config';

const MAX_REDIRECTS = 3;

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url');

  if (!rawUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const configs = await getAllConfigs();
    const allowedHosts = buildProxyAllowedHosts(configs);

    let currentUrl = rawUrl;
    let response: Response | null = null;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const validatedUrl = await validateProxyTarget(currentUrl, allowedHosts);
      if (!validatedUrl) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      response = await fetch(validatedUrl, {
        cache: 'no-store',
        redirect: 'manual',
      });

      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get('location')
      ) {
        if (redirectCount === MAX_REDIRECTS) {
          return new NextResponse('Bad Gateway', { status: 502 });
        }

        currentUrl = new URL(
          response.headers.get('location') || '',
          validatedUrl
        ).toString();
        continue;
      }

      break;
    }

    if (!response || !response.ok || !response.body) {
      return new NextResponse('Bad Gateway', { status: 502 });
    }

    const headers = copySafeProxyResponseHeaders(response.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/octet-stream');
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(headers.entries()),
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Bad Gateway', { status: 502 });
  }
}
