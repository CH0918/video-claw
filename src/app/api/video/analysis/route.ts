import { VIDEO_ANALYSIS_CREDIT_COST } from '@/shared/lib/ai-models';
import { respData, respErr } from '@/shared/lib/resp';
import {
  buildVideoAnalysisSourceReference,
  consumeCredits,
  CreditReferenceType,
  isInsufficientCreditsError,
  refundCredits,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import {
  cleanupPreparedVideoAnalysisStart,
  markVideoAnalysisAsError,
  prepareVideoAnalysisStart,
  startPreparedVideoAnalysis,
} from '@/shared/services/video-analysis';

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

    const prepared = await prepareVideoAnalysisStart(String(url));
    if (prepared.action === 'reuse') {
      return respData(prepared.response);
    }

    let consumedCredit;
    try {
      consumedCredit = await consumeCredits({
        userId: user.id,
        credits: VIDEO_ANALYSIS_CREDIT_COST,
        scene: 'video-analysis',
        description: 'video analysis',
        metadata: JSON.stringify({
          type: 'video-analysis',
          sourceType: prepared.sourceType,
          sourceId: prepared.sourceId,
        }),
        referenceType: CreditReferenceType.VIDEO_ANALYSIS_SOURCE,
        referenceId: buildVideoAnalysisSourceReference(
          prepared.sourceType,
          prepared.sourceId
        ),
      });
    } catch (error) {
      await cleanupPreparedVideoAnalysisStart(
        prepared,
        isInsufficientCreditsError(error)
          ? 'Insufficient credits'
          : 'Video analysis start aborted'
      );

      if (isInsufficientCreditsError(error)) {
        return respErr('insufficient credits');
      }

      throw error;
    }

    try {
      const result = await startPreparedVideoAnalysis(prepared);
      return respData(result);
    } catch (error: any) {
      if (consumedCredit?.id) {
        await refundCredits(consumedCredit.id);
      }
      await markVideoAnalysisAsError(
        prepared.recordId,
        error?.message || 'video analysis submit failed'
      );

      throw error;
    }
  } catch (e: any) {
    console.log('video analysis submit failed:', e);
    return respErr(e.message || 'video analysis submit failed');
  }
}
