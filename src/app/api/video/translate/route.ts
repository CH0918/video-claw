import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { translateVideoCaptions } from '@/shared/services/video-analysis';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { analysisId, targetLanguage } = await req.json();
    if (!analysisId || !targetLanguage) {
      return respErr('analysisId and targetLanguage are required');
    }

    const result = await translateVideoCaptions(
      String(analysisId),
      String(targetLanguage)
    );

    return respData(result);
  } catch (e: any) {
    console.log('video translate failed:', e);
    return respErr(e.message || 'video translate failed');
  }
}
