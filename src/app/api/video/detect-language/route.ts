import { respData, respErr } from '@/shared/lib/resp';
import { detectLanguageFromText } from '@/shared/services/video-analysis';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) {
      return respErr('text is required');
    }

    const language = await detectLanguageFromText(String(text));

    return respData({ language });
  } catch (e: any) {
    console.log('detect language failed:', e);
    return respErr('detect language failed');
  }
}
