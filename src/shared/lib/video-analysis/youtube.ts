const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

export function extractYouTubeVideoId(input: string) {
  const value = String(input || '').trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!YOUTUBE_HOSTS.has(url.hostname)) {
      return null;
    }

    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace(/^\/+/, '').split('/')[0] || null;
    }

    if (url.pathname.startsWith('/watch')) {
      return url.searchParams.get('v');
    }

    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.split('/')[2] || null;
    }

    if (url.pathname.startsWith('/embed/')) {
      return url.pathname.split('/')[2] || null;
    }

    return url.searchParams.get('v');
  } catch {
    return null;
  }
}

export function normalizeYouTubeUrl(input: string) {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildYouTubeEmbedUrl(videoId: string, startSeconds?: number) {
  const url = new URL(`https://www.youtube.com/embed/${videoId}`);
  url.searchParams.set('rel', '0');
  url.searchParams.set('modestbranding', '1');
  url.searchParams.set('enablejsapi', '1');
  if (startSeconds && startSeconds > 0) {
    url.searchParams.set('start', String(Math.max(0, Math.floor(startSeconds))));
  }
  return url.toString();
}
