import { respData, respErr } from '@/shared/lib/resp';
import {
  isInsufficientCreditsError,
  refundCredits,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { translateVideoCaptions } from '@/shared/services/video-analysis';
import { consumeVideoSubtitleTranslationCredits } from '@/shared/services/video-analysis/credits';

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

    let consumedCreditId: string | null = null;
    try {
      const { consumedCredit } = await consumeVideoSubtitleTranslationCredits({
        userId: user.id,
        analysisId: String(analysisId),
        targetLanguage: String(targetLanguage),
      });
      consumedCreditId = consumedCredit?.id || null;
    } catch (error) {
      if (isInsufficientCreditsError(error)) {
        return Response.json(
          {
            code: -1,
            message: 'insufficient credits',
          },
          { status: 402 }
        );
      }

      throw error;
    }

    try {
      const result = await translateVideoCaptions(
        String(analysisId),
        String(targetLanguage)
      );

      return respData(result);
    } catch (error) {
      if (consumedCreditId) {
        await refundCredits(consumedCreditId);
      }
      throw error;
    }
  } catch (e: any) {
    console.log('video translate failed:', e);
    return respErr('video translate failed');
  }
}
