import { envConfigs } from '@/config';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import {
  createAITask,
  NewAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import {
  consumeCredits,
  CreditReferenceType,
  isInsufficientCreditsError,
  refundCredits,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

export async function POST(request: Request) {
  try {
    let { provider, mediaType, model, prompt, options, scene } =
      await request.json();

    if (!provider || !mediaType || !model) {
      throw new Error('invalid params');
    }

    if (!prompt && !options) {
      throw new Error('prompt or options is required');
    }

    const aiService = await getAIService();

    // check generate type
    if (!aiService.getMediaTypes().includes(mediaType)) {
      throw new Error('invalid mediaType');
    }

    // check ai provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      throw new Error('invalid provider');
    }

    // get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // todo: get cost credits from settings
    let costCredits = 2;

    if (mediaType === AIMediaType.IMAGE) {
      // generate image
      if (scene === 'image-to-image') {
        costCredits = 4;
      } else if (scene === 'text-to-image') {
        costCredits = 2;
      } else {
        throw new Error('invalid scene');
      }
    } else if (mediaType === AIMediaType.VIDEO) {
      // generate video
      if (scene === 'text-to-video') {
        costCredits = 6;
      } else if (scene === 'image-to-video') {
        costCredits = 8;
      } else if (scene === 'video-to-video') {
        costCredits = 10;
      } else {
        throw new Error('invalid scene');
      }
    } else if (mediaType === AIMediaType.MUSIC) {
      // generate music
      costCredits = 10;
      scene = 'text-to-music';
    } else {
      throw new Error('invalid mediaType');
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;
    const localTaskId = getUuid();

    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
      options,
    };

    let consumedCredit;
    try {
      consumedCredit = await consumeCredits({
        userId: user.id,
        credits: costCredits,
        scene,
        description: `generate ${mediaType}`,
        metadata: JSON.stringify({
          type: 'ai-task',
          mediaType,
          taskId: localTaskId,
        }),
        referenceType: CreditReferenceType.AI_TASK,
        referenceId: localTaskId,
      });
    } catch (error) {
      if (isInsufficientCreditsError(error)) {
        throw new Error('insufficient credits');
      }

      throw error;
    }

    const draftTask: NewAITask = {
      id: localTaskId,
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt,
      scene,
      options: options ? JSON.stringify(options) : null,
      status: AITaskStatus.PENDING,
      costCredits,
      taskId: null,
      taskInfo: null,
      taskResult: null,
      creditId: consumedCredit.id,
    };

    try {
      await createAITask(draftTask);
    } catch (error) {
      await refundCredits(consumedCredit.id);
      throw error;
    }

    try {
      const result = await aiProvider.generate({ params });
      if (!result?.taskId) {
        throw new Error(
          `ai generate failed, mediaType: ${mediaType}, provider: ${provider}, model: ${model}`
        );
      }

      const updatedTask = await updateAITaskById(localTaskId, {
        status: result.taskStatus,
        taskId: result.taskId,
        taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
        taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
        creditId: consumedCredit.id,
      });

      return respData(updatedTask || { ...draftTask, ...result });
    } catch (error: any) {
      await updateAITaskById(localTaskId, {
        status: AITaskStatus.FAILED,
        taskInfo: JSON.stringify({
          errorMessage: error?.message || 'generate failed',
        }),
        creditId: consumedCredit.id,
      });

      throw error;
    }
  } catch (e: any) {
    console.log('generate failed', e);
    return respErr(e.message);
  }
}
