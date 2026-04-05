import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { generateThemeTopics } from '@/shared/services/video-analysis';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { analysisId, theme } = await req.json();
    if (!analysisId || !theme) {
      return respErr('analysisId and theme are required');
    }

    const topics = await generateThemeTopics(String(analysisId), String(theme));
    return respData({ topics });
  } catch (e: any) {
    console.log('video topic failed:', e);
    return respErr('video topic failed');
  }
}
