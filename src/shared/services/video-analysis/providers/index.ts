import {
  DeapiTranscriptProvider,
} from './deapi';
import { DeepseekReasoningProvider } from './deepseek';
import {
  ReasoningProviderConfig,
  TranscriptProvider,
  TranscriptProviderConfig,
  VideoReasoningProvider,
} from './types';

export function getTranscriptProvider(config: TranscriptProviderConfig): TranscriptProvider {
  if (config.provider === 'deapi') {
    return new DeapiTranscriptProvider(config);
  }

  throw new Error(`Unsupported transcript provider: ${config.provider}`);
}

export function getVideoReasoningProvider(
  config: ReasoningProviderConfig
): VideoReasoningProvider {
  if (config.provider === 'deepseek') {
    return new DeepseekReasoningProvider(config);
  }

  throw new Error(`Unsupported video reasoning provider: ${config.provider}`);
}
