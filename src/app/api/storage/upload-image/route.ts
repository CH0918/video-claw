import { enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';
import { md5 } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getStorageService } from '@/shared/services/storage';

const MAX_UPLOAD_FILES = 4;
const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const extFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return map[mimeType] || '';
};

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return Response.json(
        { code: -1, message: 'no auth, please sign in' },
        { status: 401 }
      );
    }

    const limited = enforceMinIntervalRateLimit(req, {
      intervalMs: 3000,
      keyPrefix: 'upload-image',
    });
    if (limited) {
      return limited;
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    if (files.length > MAX_UPLOAD_FILES) {
      return Response.json(
        {
          code: -1,
          message: `Too many files. Maximum ${MAX_UPLOAD_FILES} files per request.`,
        },
        { status: 400 }
      );
    }

    const storageService = await getStorageService();
    const uploadResults = [];

    for (const file of files) {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
        return Response.json(
          {
            code: -1,
            message: `File ${file.name} has an unsupported image type`,
          },
          { status: 415 }
        );
      }

      if (file.size <= 0 || file.size > MAX_UPLOAD_FILE_BYTES) {
        return Response.json(
          {
            code: -1,
            message: `File ${file.name} exceeds the ${Math.floor(MAX_UPLOAD_FILE_BYTES / (1024 * 1024))}MB limit`,
          },
          { status: 413 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      const digest = md5(body);
      const ext = extFromMime(file.type) || file.name.split('.').pop() || 'bin';
      const key = `${digest}.${ext}`;

      // If the same image already exists, reuse its URL to save storage space.
      // (Still depends on provider supporting signed HEAD + public url generation.)
      const exists = await storageService.exists({ key });
      if (exists) {
        const publicUrl = storageService.getPublicUrl({ key });
        if (publicUrl) {
          uploadResults.push({
            url: publicUrl,
            key,
            filename: file.name,
            deduped: true,
          });
          continue;
        }
      }

      // Upload to storage
      const result = await storageService.uploadFile({
        body,
        key: key,
        contentType: file.type,
        disposition: 'inline',
      });

      if (!result.success) {
        console.error('[API] Upload failed:', result.error);
        return Response.json(
          { code: -1, message: 'Upload failed' },
          { status: 502 }
        );
      }

      uploadResults.push({
        url: result.url,
        key: result.key,
        filename: file.name,
        deduped: false,
      });
    }

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e) {
    console.error('upload image failed:', e);
    return respErr('upload image failed');
  }
}
