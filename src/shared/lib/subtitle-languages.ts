export type SubtitleLanguage = {
  value: string;
  label: string;
};

export const SUBTITLE_LANGUAGES: SubtitleLanguage[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'th', label: 'ไทย' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'sv', label: 'Svenska' },
  { value: 'da', label: 'Dansk' },
  { value: 'fi', label: 'Suomi' },
  { value: 'no', label: 'Norsk' },
  { value: 'uk', label: 'Українська' },
  { value: 'cs', label: 'Čeština' },
  { value: 'ro', label: 'Română' },
  { value: 'el', label: 'Ελληνικά' },
  { value: 'he', label: 'עברית' },
  { value: 'hu', label: 'Magyar' },
  { value: 'bn', label: 'বাংলা' },
];

export const SUBTITLE_LANGUAGE_CODES = new Set(
  SUBTITLE_LANGUAGES.map((l) => l.value)
);

export function isSupportedSubtitleLanguage(code: string) {
  return SUBTITLE_LANGUAGE_CODES.has(code);
}
