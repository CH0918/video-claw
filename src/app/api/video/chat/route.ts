import {
  VIDEO_CHAT_DEFAULT_MODEL,
  requireSupportedAIModel,
} from '@/shared/lib/ai-models';
import { respData, respErr } from '@/shared/lib/resp';
import { isInsufficientCreditsError } from '@/shared/models/credit';
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
    if (!analysisId || !Array.isArray(messages) || messages.length === 0) {
      return respErr('analysisId and messages are required');
    }

    const model = requireSupportedAIModel(
      requestedModel,
      VIDEO_CHAT_DEFAULT_MODEL
    );

    try {
      await consumeVideoChatCredits({
        userId: user.id,
        analysisId: String(analysisId),
        messages,
        model,
      });
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

    const answer = await answerVideoQuestion(String(analysisId), messages, model);
    return respData(answer);
  } catch (e: any) {
    console.log('video chat failed:', e);
    return respErr(e.message || 'video chat failed');
  }
}
