import { VIDEO_ANALYSIS_CREDIT_COST } from '@/shared/lib/ai-models';
import { respData, respErr } from '@/shared/lib/resp';
import { consumeCredits, getRemainingCredits } from '@/shared/models/credit';
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

    if (result.status === 'success' || !result.isNew) {
      return respData(result);
    }

    const remainingCredits = await getRemainingCredits(user.id);
    if (remainingCredits < VIDEO_ANALYSIS_CREDIT_COST) {
      return respErr('insufficient credits');
    }

    await consumeCredits({
      userId: user.id,
      credits: VIDEO_ANALYSIS_CREDIT_COST,
      scene: 'video-analysis',
      description: 'video analysis',
      metadata: JSON.stringify({
        type: 'video-analysis',
        analysisId: result.analysisId,
      }),
    });

    return respData(result);
  } catch (e: any) {
    console.log('video analysis submit failed:', e);
    return respErr(e.message || 'video analysis submit failed');
  }
}
