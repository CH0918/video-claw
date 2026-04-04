import { and, desc, eq } from 'drizzle-orm';

import { videoAnalysis } from '@/config/db/schema';
import { db } from '@/core/db';
import { normalizeTranscript } from '@/shared/lib/video-analysis/transcript';
import {
  TopicRange,
  TranscriptSegment,
  VideoAnalysisPayload,
  VideoAnalysisStatus,
  VideoSummary,
} from '@/shared/types/video-analysis';

export type VideoAnalysis = typeof videoAnalysis.$inferSelect;
export type NewVideoAnalysis = typeof videoAnalysis.$inferInsert;
export type UpdateVideoAnalysis = Partial<Omit<NewVideoAnalysis, 'id' | 'createdAt'>>;

export async function createVideoAnalysis(input: NewVideoAnalysis) {
  const [result] = await db().insert(videoAnalysis).values(input).returning();
  return result;
}

export async function findVideoAnalysisById(id: string) {
  const [result] = await db()
    .select()
    .from(videoAnalysis)
    .where(eq(videoAnalysis.id, id));

  return result;
}

export async function findVideoAnalysisBySource(
  sourceType: string,
  sourceId: string
) {
  const [result] = await db()
    .select()
    .from(videoAnalysis)
    .where(
      and(
        eq(videoAnalysis.sourceType, sourceType),
        eq(videoAnalysis.sourceId, sourceId)
      )
    )
    .orderBy(desc(videoAnalysis.updatedAt));

  return result;
}

export async function updateVideoAnalysis(id: string, input: UpdateVideoAnalysis) {
  const [result] = await db()
    .update(videoAnalysis)
    .set(input)
    .where(eq(videoAnalysis.id, id))
    .returning();

  return result;
}

export async function deleteVideoAnalysis(id: string) {
  const [result] = await db()
    .delete(videoAnalysis)
    .where(eq(videoAnalysis.id, id))
    .returning();

  return result;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function buildVideoAnalysisPayload(record: VideoAnalysis) {
  const transcript = normalizeTranscript(
    parseJson<TranscriptSegment[]>(record.transcript, [])
  );
  const topics = parseJson<TopicRange[]>(record.topics, []);
  const summary = parseJson<VideoSummary>(record.summary, {
    overview: '',
    points: [],
  });

  return {
    analysisId: record.id,
    status: record.status as VideoAnalysisStatus,
    videoInfo: {
      videoId: record.sourceId,
      url: record.sourceUrl,
      title: record.title || '',
      author: record.author || undefined,
      thumbnailUrl: record.thumbnailUrl || undefined,
      description: record.description || undefined,
      durationSeconds: record.durationSeconds || undefined,
      language: record.language || undefined,
    },
    transcript,
    topics,
    summary,
  } satisfies VideoAnalysisPayload;
}
