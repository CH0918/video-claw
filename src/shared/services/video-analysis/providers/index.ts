import {
  DeapiTranscriptProvider,
} from './deapi';
import { DeepseekReasoningProvider } from './deepseek';
import { EvolinkReasoningProvider } from './evolink';
import { TranscriptApiProvider } from './transcriptapi';
import {
  ReasoningProviderConfig,
  TranscriptProvider,
  TranscriptProviderConfig,
  VideoReasoningProvider,
} from './types';

export function getTranscriptProvider(config: TranscriptProviderConfig): TranscriptProvider {
  if (config.provider === 'transcriptapi') {
    return new TranscriptApiProvider(config);
  }

  if (config.provider === 'deapi') {
    return new DeapiTranscriptProvider(config);
  }

  throw new Error(`Unsupported transcript provider: ${config.provider}`);
}

export function getVideoReasoningProvider(
  config: ReasoningProviderConfig
): VideoReasoningProvider {
  if (config.provider === 'evolink') {
    return new EvolinkReasoningProvider(config);
  }

  if (config.provider === 'deepseek') {
    return new DeepseekReasoningProvider(config);
  }

  throw new Error(`Unsupported video reasoning provider: ${config.provider}`);
}
