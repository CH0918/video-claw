import { respData, respErr } from '@/shared/lib/resp';
import {
  buildVideoAnalysisSourceReference,
  CreditReferenceType,
  findActiveConsumeCreditByReference,
  refundCredits,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { findVideoAnalysisById } from '@/shared/models/video_analysis';
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

    const record = await findVideoAnalysisById(String(analysisId));
    if (!record) {
      return respErr('analysis not found');
    }

    const result = await getVideoAnalysisStatus(String(analysisId));

    if (result.status === 'error') {
      const consumeRecord = await findActiveConsumeCreditByReference({
        userId: user.id,
        referenceType: CreditReferenceType.VIDEO_ANALYSIS_SOURCE,
        referenceId: buildVideoAnalysisSourceReference(
          record.sourceType,
          record.sourceId
        ),
      });
      if (consumeRecord) {
        await refundCredits(consumeRecord.id);
      }
    }

    return respData(result);
  } catch (e: any) {
    console.log('video analysis status failed:', e);
    return respErr(e.message || 'video analysis status failed');
  }
}
