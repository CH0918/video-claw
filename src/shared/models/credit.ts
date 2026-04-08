import { and, asc, count, desc, eq, gt, isNull, or, sql, sum } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { credit } from '@/config/db/schema';
import { isUniqueConstraintError } from '@/shared/lib/db-error';
import { getSnowId, getUuid, md5 } from '@/shared/lib/hash';
import { safeJsonParse } from '@/shared/lib/api-security';

import { getAllConfigs } from './config';
import type { User } from './user';

export type Credit = typeof credit.$inferSelect & {
  user?: User;
};
export type NewCredit = typeof credit.$inferInsert;
export type UpdateCredit = Partial<
  Omit<NewCredit, 'id' | 'transactionNo' | 'createdAt'>
>;

export enum CreditStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum CreditTransactionType {
  GRANT = 'grant', // grant credit
  CONSUME = 'consume', // consume credit
}

export enum CreditTransactionScene {
  PAYMENT = 'payment', // payment
  SUBSCRIPTION = 'subscription', // subscription
  RENEWAL = 'renewal', // renewal
  GIFT = 'gift', // gift
  REWARD = 'reward', // reward
}

export enum CreditReferenceType {
  VIDEO_ANALYSIS_SOURCE = 'video-analysis-source',
  VIDEO_CHAT = 'video-chat',
  VIDEO_SUBTITLE_TRANSLATION = 'video-subtitle-translation',
  AI_TASK = 'ai-task',
  NEW_USER_INITIAL_CREDITS = 'new-user-initial-credits',
}

export function isInsufficientCreditsError(error: unknown) {
  return String((error as Error | undefined)?.message || '')
    .toLowerCase()
    .includes('insufficient credits');
}

export function buildVideoAnalysisSourceReference(
  sourceType: string,
  sourceId: string
) {
  return `${sourceType}:${sourceId}`;
}

// Calculate credit expiration time based on order and subscription info
export function calculateCreditExpirationTime({
  creditsValidDays,
  currentPeriodEnd,
}: {
  creditsValidDays: number;
  currentPeriodEnd?: Date;
}): Date | null {
  const now = new Date();

  // Check if credits should never expire
  if (!creditsValidDays || creditsValidDays <= 0) {
    // never expires
    return null;
  }

  const expiresAt = new Date();

  if (currentPeriodEnd) {
    // For subscription: credits expire at the end of current period
    expiresAt.setTime(currentPeriodEnd.getTime());
  } else {
    // For one-time payment: use configured validity days
    expiresAt.setDate(now.getDate() + creditsValidDays);
  }

  return expiresAt;
}

// Helper function to create expiration condition for queries
export function createExpirationCondition() {
  const currentTime = new Date();
  // Credit is valid if: expires_at IS NULL OR expires_at > current_time
  return or(isNull(credit.expiresAt), gt(credit.expiresAt, currentTime));
}

// create credit
export async function createCredit(newCredit: NewCredit) {
  const [result] = await db().insert(credit).values(newCredit).returning();
  return result;
}

// get credits
export async function getCredits({
  userId,
  status,
  transactionType,
  getUser = false,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
  getUser?: boolean;
  page?: number;
  limit?: number;
}): Promise<Credit[]> {
  const result = await db()
    .select()
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    )
    .orderBy(desc(credit.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    const { appendUserToResult } = await import('./user');
    return appendUserToResult(result);
  }

  return result;
}

// get credits count
export async function getCreditsCount({
  userId,
  status,
  transactionType,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    );

  return result?.count || 0;
}

// consume credits
export async function consumeCredits({
  userId,
  credits,
  scene,
  description,
  metadata,
  referenceType,
  referenceId,
  tx,
}: {
  userId: string;
  credits: number; // credits to consume
  scene?: string;
  description?: string;
  metadata?: string;
  referenceType?: string;
  referenceId?: string;
  tx?: any;
}) {
  if (credits <= 0) {
    throw new Error(`credits must be greater than 0, got ${credits}`);
  }

  const currentTime = new Date();

  if (envConfigs.database_provider === 'd1' && !tx) {
    return consumeCreditsOnD1({
      userId,
      credits,
      scene,
      description,
      metadata,
      referenceType,
      referenceId,
      currentTime,
    });
  }

  // consume credits
  const execute = async (tx: any) => {
    // 1. check credits balance
    const [creditsBalance] = await tx
      .select({
        total: sum(credit.remainingCredits),
      })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          or(
            isNull(credit.expiresAt), // Never expires
            gt(credit.expiresAt, currentTime) // Not yet expired
          )
        )
      );

    // balance is not enough
    if (
      !creditsBalance ||
      !creditsBalance.total ||
      parseFloat(creditsBalance.total) < credits
    ) {
      throw new Error(
        `Insufficient credits, ${creditsBalance?.total || 0} < ${credits}`
      );
    }

    // 2. get available credits, FIFO queue with expiresAt, batch query
    let remainingToConsume = credits; // remaining credits to consume

    // only deal with 10000 credit grant records
    let batchNo = 1; // batch no
    const maxBatchNo = 10; // max batch no
    const batchSize = 1000; // batch size
    const consumedItems: any[] = [];

    while (remainingToConsume > 0) {
      // get batch credits
      const batchCredits = await tx
        .select()
        .from(credit)
        .where(
          and(
            eq(credit.userId, userId),
            eq(credit.transactionType, CreditTransactionType.GRANT),
            eq(credit.status, CreditStatus.ACTIVE),
            gt(credit.remainingCredits, 0),
            or(
              isNull(credit.expiresAt), // Never expires
              gt(credit.expiresAt, currentTime) // Not yet expired
            )
          )
        )
        .orderBy(
          // FIFO queue: expired credits first, then by expiration date
          // NULL values (never expires) will be ordered last
          asc(credit.expiresAt)
        )
        .limit(batchSize) // batch size
        .offset(0) // exhausted rows drop out, so always re-read from the head
        .for('update'); // lock for update

      // no more credits
      if (batchCredits?.length === 0) {
        break;
      }

      // consume credits for each item
      for (const item of batchCredits) {
        // no need to consume more
        if (remainingToConsume <= 0) {
          break;
        }
        const toConsume = Math.min(remainingToConsume, item.remainingCredits);

        // update remaining credits
        await tx
          .update(credit)
          .set({ remainingCredits: item.remainingCredits - toConsume })
          .where(eq(credit.id, item.id));

        // update consumed items
        consumedItems.push({
          creditId: item.id,
          transactionNo: item.transactionNo,
          expiresAt: item.expiresAt,
          creditsToConsume: remainingToConsume,
          creditsConsumed: toConsume,
          creditsBefore: item.remainingCredits,
          creditsAfter: item.remainingCredits - toConsume,
          batchSize: batchSize,
          batchNo: batchNo,
        });

        remainingToConsume -= toConsume;
      }

      batchNo += 1;

      // if too many batches, throw error
      if (remainingToConsume > 0 && batchNo > maxBatchNo) {
        throw new Error(`Too many batches: ${batchNo} > ${maxBatchNo}`);
      }
    }

    if (remainingToConsume > 0) {
      throw new Error(
        `Insufficient credits after lock, ${credits - remainingToConsume} < ${credits}`
      );
    }

    // 3. create consumed credit
    const consumedCredit: NewCredit = {
      id: getUuid(),
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.CONSUME,
      transactionScene: scene,
      userId: userId,
      status: CreditStatus.ACTIVE,
      description: description,
      credits: -credits,
      consumedDetail: JSON.stringify(consumedItems),
      metadata: metadata,
      referenceType: referenceType,
      referenceId: referenceId,
    };
    await tx.insert(credit).values(consumedCredit);

    return consumedCredit;
  };

  // use provided transaction
  if (tx) {
    return await execute(tx);
  }

  // use default transaction
  return await db().transaction(execute);
}

// get remaining credits
export async function getRemainingCredits(userId: string): Promise<number> {
  const currentTime = new Date();

  const [result] = await db()
    .select({
      total: sum(credit.remainingCredits),
    })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.remainingCredits, 0),
        or(
          isNull(credit.expiresAt), // Never expires
          gt(credit.expiresAt, currentTime) // Not yet expired
        )
      )
    );

  return parseFloat(result?.total || '0');
}

// refund a consumed credit transaction
export async function refundCredits(creditId: string) {
  if (envConfigs.database_provider === 'd1') {
    return refundCreditsOnD1(creditId);
  }

  return await db().transaction(async (tx: any) => {
    const [consumedCredit] = await tx
      .select()
      .from(credit)
      .where(eq(credit.id, creditId));

    if (
      !consumedCredit ||
      consumedCredit.status !== CreditStatus.ACTIVE ||
      consumedCredit.transactionType !== CreditTransactionType.CONSUME
    ) {
      return false;
    }

    const consumedItems = safeJsonParse<any[]>(
      consumedCredit.consumedDetail,
      []
    );

    await Promise.all(
      consumedItems.map((item: any) => {
        if (item && item.creditId && item.creditsConsumed > 0) {
          return tx
            .update(credit)
            .set({
              remainingCredits: sql`${credit.remainingCredits} + ${item.creditsConsumed}`,
            })
            .where(eq(credit.id, item.creditId));
        }
      })
    );

    await tx
      .update(credit)
      .set({ status: CreditStatus.DELETED })
      .where(eq(credit.id, creditId));

    return true;
  });
}

function buildD1ConsumeTransactionNo({
  userId,
  referenceType,
  referenceId,
}: {
  userId: string;
  referenceType?: string;
  referenceId?: string;
}) {
  if (referenceType && referenceId) {
    return `consume:${md5(`${userId}:${referenceType}:${referenceId}`)}`;
  }

  return getSnowId();
}

function isD1OptimisticConflict(error: unknown) {
  const message = String((error as Error | undefined)?.message || '').toLowerCase();
  return (
    message.includes('malformed json') ||
    message.includes('d1 optimistic conflict')
  );
}

function createD1OptimisticConflictError(message = 'D1 optimistic conflict') {
  return new Error(message);
}

async function consumeCreditsOnD1({
  userId,
  credits,
  scene,
  description,
  metadata,
  referenceType,
  referenceId,
  currentTime,
}: {
  userId: string;
  credits: number;
  scene?: string;
  description?: string;
  metadata?: string;
  referenceType?: string;
  referenceId?: string;
  currentTime: Date;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const transactionNo = buildD1ConsumeTransactionNo({
      userId,
      referenceType,
      referenceId,
    });
    if (referenceType && referenceId) {
      const existingConsume = await findActiveConsumeCreditByReference({
        userId,
        referenceType,
        referenceId,
      });

      if (existingConsume) {
        return existingConsume;
      }
    }

    const [creditsBalance] = await db()
      .select({
        total: sum(credit.remainingCredits),
      })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          or(isNull(credit.expiresAt), gt(credit.expiresAt, currentTime))
        )
      );

    if (
      !creditsBalance ||
      !creditsBalance.total ||
      parseFloat(creditsBalance.total) < credits
    ) {
      throw new Error(
        `Insufficient credits, ${creditsBalance?.total || 0} < ${credits}`
      );
    }

    let remainingToConsume = credits;
    let batchNo = 1;
    const maxBatchNo = 10;
    const batchSize = 1000;
    const consumedItems: any[] = [];

    while (remainingToConsume > 0) {
      const batchCredits = await db()
        .select()
        .from(credit)
        .where(
          and(
            eq(credit.userId, userId),
            eq(credit.transactionType, CreditTransactionType.GRANT),
            eq(credit.status, CreditStatus.ACTIVE),
            gt(credit.remainingCredits, 0),
            or(isNull(credit.expiresAt), gt(credit.expiresAt, currentTime))
          )
        )
        .orderBy(sql`${credit.expiresAt} is null`, asc(credit.expiresAt))
        .limit(batchSize);

      if (batchCredits.length === 0) {
        break;
      }

      for (const item of batchCredits) {
        if (remainingToConsume <= 0) {
          break;
        }

        const toConsume = Math.min(remainingToConsume, item.remainingCredits);

        consumedItems.push({
          creditId: item.id,
          transactionNo: item.transactionNo,
          expiresAt: item.expiresAt,
          creditsToConsume: remainingToConsume,
          creditsConsumed: toConsume,
          creditsBefore: item.remainingCredits,
          creditsAfter: item.remainingCredits - toConsume,
          batchSize,
          batchNo,
        });

        remainingToConsume -= toConsume;
      }

      batchNo += 1;

      if (remainingToConsume > 0 && batchNo > maxBatchNo) {
        throw new Error(`Too many batches: ${batchNo} > ${maxBatchNo}`);
      }
    }

    if (remainingToConsume > 0) {
      throw new Error(
        `Insufficient credits after optimistic check, ${credits - remainingToConsume} < ${credits}`
      );
    }

    const consumedCredit: NewCredit = {
      id: getUuid(),
      transactionNo,
      transactionType: CreditTransactionType.CONSUME,
      transactionScene: scene,
      userId,
      status: CreditStatus.ACTIVE,
      description,
      credits: -credits,
      consumedDetail: JSON.stringify(consumedItems),
      metadata,
      referenceType,
      referenceId,
    };

    const d = db();
    const queries: any[] = [
      d.insert(credit).values(consumedCredit).returning(),
    ];

    for (const item of consumedItems) {
      queries.push(
        d.update(credit)
          .set({
            remainingCredits: item.creditsAfter,
          })
          .where(
            and(
              eq(credit.id, item.creditId),
              eq(credit.remainingCredits, item.creditsBefore),
              eq(credit.status, CreditStatus.ACTIVE),
              eq(credit.transactionType, CreditTransactionType.GRANT)
            )
          )
          .returning({ id: credit.id })
      );
    }

    try {
      const batchResults = await d.batch(queries as any);

      for (let index = 1; index < batchResults.length; index += 1) {
        const updatedRows = batchResults[index] as Array<{ id: string }>;
        if (!Array.isArray(updatedRows) || updatedRows.length !== 1) {
          throw createD1OptimisticConflictError();
        }
      }

      return batchResults[0][0];
    } catch (error) {
      if (
        (isUniqueConstraintError(error) || isD1OptimisticConflict(error)) &&
        referenceType &&
        referenceId
      ) {
        const existingConsume = await findActiveConsumeCreditByReference({
          userId,
          referenceType,
          referenceId,
        });

        if (existingConsume) {
          return existingConsume;
        }
      }

      if ((isD1OptimisticConflict(error) || isUniqueConstraintError(error)) && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('consume credits conflict, please retry');
}

async function refundCreditsOnD1(creditId: string) {
  const [consumedCredit] = await db()
    .select()
    .from(credit)
    .where(eq(credit.id, creditId))
    .limit(1);

  if (
    !consumedCredit ||
    consumedCredit.status !== CreditStatus.ACTIVE ||
    consumedCredit.transactionType !== CreditTransactionType.CONSUME
  ) {
    return false;
  }

  const consumedItems = safeJsonParse<any[]>(consumedCredit.consumedDetail, []);
  const d = db();
  const queries: any[] = [
    d.update(credit)
      .set({
        status: CreditStatus.DELETED,
        transactionNo: getSnowId(),
      })
      .where(
        and(
          eq(credit.id, creditId),
          eq(credit.status, CreditStatus.ACTIVE),
          eq(credit.transactionType, CreditTransactionType.CONSUME)
        )
      )
      .returning({ id: credit.id }),
  ];

  for (const item of consumedItems) {
    if (item && item.creditId && item.creditsConsumed > 0) {
      queries.push(
        d.update(credit)
          .set({
            remainingCredits: sql`${credit.remainingCredits} + ${item.creditsConsumed}`,
          })
          .where(eq(credit.id, item.creditId))
          .returning({ id: credit.id })
      );
    }
  }

  try {
    const batchResults = await d.batch(queries as any);

    for (let index = 0; index < batchResults.length; index += 1) {
      const updatedRows = batchResults[index] as Array<{ id: string }>;
      if (!Array.isArray(updatedRows) || updatedRows.length !== 1) {
        throw createD1OptimisticConflictError();
      }
    }

    return true;
  } catch (error) {
    if (isD1OptimisticConflict(error)) {
      const [currentCredit] = await db()
        .select()
        .from(credit)
        .where(eq(credit.id, creditId))
        .limit(1);

      if (currentCredit?.status === CreditStatus.DELETED) {
        return false;
      }
    }

    throw error;
  }
}

export async function findActiveConsumeCreditByReference({
  userId,
  referenceType,
  referenceId,
}: {
  userId: string;
  referenceType: string;
  referenceId: string;
}) {
  const [result] = await db()
    .select()
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.CONSUME),
        eq(credit.status, CreditStatus.ACTIVE),
        eq(credit.referenceType, referenceType),
        eq(credit.referenceId, referenceId)
      )
    )
    .limit(1);

  return result || null;
}

export async function findActiveGrantCreditByReference({
  userId,
  referenceType,
  referenceId,
}: {
  userId: string;
  referenceType: string;
  referenceId: string;
}) {
  const [result] = await db()
    .select()
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.status, CreditStatus.ACTIVE),
        eq(credit.referenceType, referenceType),
        eq(credit.referenceId, referenceId)
      )
    )
    .limit(1);

  return result || null;
}

// grant credits for new user
export async function grantCreditsForNewUser(user: User) {
  if (!user?.id || !user?.email) {
    return;
  }

  // get configs from db
  const configs = await getAllConfigs();

  // if initial credits enabled
  if (configs.initial_credits_enabled !== 'true') {
    return;
  }

  // get initial credits amount and valid days
  const credits = parseFloat(configs.initial_credits_amount as string) || 0;
  if (credits <= 0) {
    return;
  }

  const creditsValidDays =
    parseInt(configs.initial_credits_valid_days as string) || 0;

  const description = configs.initial_credits_description || 'initial credits';

  const existingInitialCredit = await findActiveGrantCreditByReference({
    userId: user.id,
    referenceType: CreditReferenceType.NEW_USER_INITIAL_CREDITS,
    referenceId: user.id,
  });
  if (existingInitialCredit) {
    return existingInitialCredit;
  }

  const newCredit = await grantCreditsForUser({
    user: user,
    credits: credits,
    validDays: creditsValidDays,
    description: description,
    referenceType: CreditReferenceType.NEW_USER_INITIAL_CREDITS,
    referenceId: user.id,
  });

  return newCredit;
}

// grant credits for user
export async function grantCreditsForUser({
  user,
  credits,
  validDays,
  description,
  referenceType,
  referenceId,
}: {
  user: User;
  credits: number;
  validDays?: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}) {
  if (credits <= 0) {
    return;
  }

  const creditsValidDays = validDays && validDays > 0 ? validDays : 0;

  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: creditsValidDays,
  });

  const creditDescription = description || 'grant credits';

  const newCredit: NewCredit = {
    id: getUuid(),
    userId: user.id,
    userEmail: user.email,
    orderNo: '',
    subscriptionNo: '',
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.GIFT,
    credits: credits,
    remainingCredits: credits,
    description: creditDescription,
    expiresAt: expiresAt,
    status: CreditStatus.ACTIVE,
    referenceType,
    referenceId,
  };

  await createCredit(newCredit);

  return newCredit;
}
