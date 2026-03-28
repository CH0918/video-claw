import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getVideoAnalysisStatus } from '@/shared/services/video-analysis';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { analysisId } = await req.json();
    if (!analysisId) {
      return respErr('analysisId is required');
    }

    const result = await getVideoAnalysisStatus(String(analysisId));
    return respData(result);
  } catch (e: any) {
    console.log('video analysis status failed:', e);
    return respErr(e.message || 'video analysis status failed');
  }
}
