export const DEFAULT_EVOLINK_BASE_URL = 'https://direct.evolink.ai/v1';

export function normalizeEvolinkBaseUrl(baseUrl?: string | null) {
  return (baseUrl || DEFAULT_EVOLINK_BASE_URL).replace(/\/+$/, '');
}
