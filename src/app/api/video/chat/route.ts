import {
  VIDEO_CHAT_DEFAULT_MODEL,
  requireSupportedAIModel,
} from '@/shared/lib/ai-models';
import { validateVideoChatMessages } from '@/shared/lib/api-security';
import { respData, respErr } from '@/shared/lib/resp';
import {
  isInsufficientCreditsError,
  refundCredits,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { answerVideoQuestion } from '@/shared/services/video-analysis';
import { consumeVideoChatCredits } from '@/shared/services/video-analysis/credits';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { analysisId, messages, model: requestedModel } = await req.json();
    const validationError = validateVideoChatMessages(messages);
    if (!analysisId || validationError) {
      return Response.json(
        { code: -1, message: validationError || 'analysisId is required' },
        { status: 400 }
      );
    }

    const model = requireSupportedAIModel(
      requestedModel,
      VIDEO_CHAT_DEFAULT_MODEL
    );

    let consumedCreditId: string | null = null;
    try {
      const { consumedCredit } = await consumeVideoChatCredits({
        userId: user.id,
        analysisId: String(analysisId),
        messages,
        model,
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
      const answer = await answerVideoQuestion(String(analysisId), messages, model);
      return respData(answer);
    } catch (error) {
      if (consumedCreditId) {
        await refundCredits(consumedCreditId);
      }
      throw error;
    }
  } catch (e: any) {
    console.log('video chat failed:', e);
    return respErr('video chat failed');
  }
}
