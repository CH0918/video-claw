import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { startVideoAnalysis } from '@/shared/services/video-analysis';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { url } = await req.json();
    if (!url) {
      return respErr('url is required');
    }

    const result = await startVideoAnalysis(String(url));
    return respData(result);
  } catch (e: any) {
    console.log('video analysis submit failed:', e);
    return respErr(e.message || 'video analysis submit failed');
  }
}
