import { and, count, desc, eq, or } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { credit, order, subscription } from '@/config/db/schema';
import { PaymentType } from '@/extensions/payment/types';
import { isUniqueConstraintError } from '@/shared/lib/db-error';

import { NewCredit } from './credit';
import {
  NewSubscription,
  UpdateSubscription,
  updateSubscriptionBySubscriptionNo,
} from './subscription';
import { appendUserToResult, User } from './user';

export type Order = typeof order.$inferSelect & {
  user?: User;
};
export type NewOrder = typeof order.$inferInsert;
export type UpdateOrder = Partial<
  Omit<NewOrder, 'id' | 'orderNo' | 'createdAt'>
>;

export enum OrderStatus {
  // processing status
  PENDING = 'pending', // order saved, waiting for checkout
  CREATED = 'created', // checkout success
  // final status
  COMPLETED = 'completed', // checkout completed, but failed
  PAID = 'paid', // order paid success
  FAILED = 'failed', // order paid, but failed
}

/**
 * create order
 */
export async function createOrder(newOrder: NewOrder) {
  const [result] = await db().insert(order).values(newOrder).returning();

  return result;
}

/**
 * get orders
 */
export async function getOrders({
  orderNo,
  userId,
  status,
  getUser,
  paymentType,
  paymentProvider,
  page = 1,
  limit = 30,
}: {
  orderNo?: string;
  userId?: string;
  status?: OrderStatus;
  getUser?: boolean;
  paymentType?: PaymentType;
  paymentProvider?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Order[]> {
  const result = await db()
    .select()
    .from(order)
    .where(
      and(
        orderNo ? eq(order.orderNo, orderNo) : undefined,
        userId ? eq(order.userId, userId) : undefined,
        status ? eq(order.status, status) : undefined,
        paymentType ? eq(order.paymentType, paymentType) : undefined,
        paymentProvider ? eq(order.paymentProvider, paymentProvider) : undefined
      )
    )
    .orderBy(desc(order.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

/**
 * get orders count
 */
export async function getOrdersCount({
  orderNo,
  userId,
  paymentType,
  status,
  paymentProvider,
}: {
  orderNo?: string;
  userId?: string;
  paymentType?: PaymentType;
  paymentProvider?: string;
  status?: OrderStatus;
} = {}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(order)
    .where(
      and(
        orderNo ? eq(order.orderNo, orderNo) : undefined,
        userId ? eq(order.userId, userId) : undefined,
        status ? eq(order.status, status) : undefined,
        paymentType ? eq(order.paymentType, paymentType) : undefined,
        paymentProvider ? eq(order.paymentProvider, paymentProvider) : undefined
      )
    );

  return result?.count || 0;
}

/**
 * find order by id
 */
export async function findOrderById(id: string) {
  const [result] = await db().select().from(order).where(eq(order.id, id));

  return result;
}

/**
 * find order by order no
 */
export async function findOrderByOrderNo(orderNo: string) {
  const [result] = await db()
    .select()
    .from(order)
    .where(eq(order.orderNo, orderNo));

  return result;
}

/**
 * find order by transaction id and payment provider
 */
export async function findOrderByTransactionId({
  transactionId,
  paymentProvider,
}: {
  transactionId: string;
  paymentProvider: string;
}) {
  const [result] = await db()
    .select()
    .from(order)
    .where(
      and(
        eq(order.transactionId, transactionId),
        eq(order.paymentProvider, paymentProvider)
      )
    );

  return result;
}

/**
 * update order
 */
export async function updateOrderByOrderNo(
  orderNo: string,
  updateOrder: UpdateOrder,
  options?: {
    // Only update if current status matches (optimistic lock)
    expectedStatus?: OrderStatus;
  }
) {
  const conditions = [eq(order.orderNo, orderNo)];

  // Add status check for optimistic locking
  if (options?.expectedStatus) {
    conditions.push(eq(order.status, options.expectedStatus));
  }

  const [result] = await db()
    .update(order)
    .set(updateOrder)
    .where(and(...conditions))
    .returning();

  return result;
}

/**
 * update order by order id
 */
export async function updateOrderByOrderId(
  orderId: string,
  updateOrder: UpdateOrder
) {
  const [result] = await db()
    .update(order)
    .set(updateOrder)
    .where(eq(order.id, orderId))
    .returning();

  return result;
}

export async function updateOrderInTransaction({
  orderNo,
  updateOrder,
  newSubscription,
  newCredit,
}: {
  orderNo: string;
  updateOrder: UpdateOrder;
  newSubscription?: NewSubscription;
  newCredit?: NewCredit;
}) {
  if (!orderNo || !updateOrder) {
    throw new Error('orderNo and updateOrder are required');
  }

  // only update order, no need transaction
  if (!newSubscription && !newCredit) {
    return updateOrderByOrderNo(orderNo, updateOrder);
  }

  if (envConfigs.database_provider === 'd1') {
    return updateOrderInD1({
      orderNo,
      updateOrder,
      newSubscription,
      newCredit,
    });
  }

  // need transaction
  const result = await db().transaction(async (tx: any) => {
    let result: any = {
      order: null,
      subscription: null,
      credit: null,
    };

    // update order with optimistic lock
    // only update if status is not PAID (prevent duplicate processing)
    const [orderResult] = await tx
      .update(order)
      .set(updateOrder)
      .where(
        and(
          eq(order.orderNo, orderNo),
          // Only update if not already paid (optimistic lock)
          updateOrder.status === OrderStatus.PAID
            ? or(
                eq(order.status, OrderStatus.CREATED),
                eq(order.status, OrderStatus.PENDING)
              )
            : undefined
        )
      )
      .returning();

    // If no order was updated and we're trying to set status to PAID,
    // it means the order was already processed
    if (!orderResult && updateOrder.status === OrderStatus.PAID) {
      console.log(`Order ${orderNo} already paid or not in CREATED status, skipping update`);
      return result;
    }

    result.order = orderResult;

    // deal with subscription
    if (newSubscription) {
      let existingSubscription: any = null;

      try {
        const [subscriptionResult] = await tx
          .insert(subscription)
          .values(newSubscription)
          .returning();

        existingSubscription = subscriptionResult;
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        const [existingSubscriptionResult] = await tx
          .select()
          .from(subscription)
          .where(
            and(
              eq(subscription.subscriptionId, newSubscription.subscriptionId),
              eq(subscription.paymentProvider, newSubscription.paymentProvider)
            )
          );

        existingSubscription = existingSubscriptionResult;
      }

      result.subscription = existingSubscription;

      if (
        result.order &&
        existingSubscription?.subscriptionNo &&
        result.order.subscriptionNo !== existingSubscription.subscriptionNo
      ) {
        const [updatedOrder] = await tx
          .update(order)
          .set({ subscriptionNo: existingSubscription.subscriptionNo })
          .where(eq(order.orderNo, orderNo))
          .returning();

        result.order = updatedOrder;
      }
    }

    // deal with credit
    if (newCredit) {
      const creditToInsert = result.subscription?.subscriptionNo
        ? {
            ...newCredit,
            subscriptionNo: result.subscription.subscriptionNo,
          }
        : newCredit;
      const [creditResult] = await tx
        .insert(credit)
        .values(creditToInsert)
        .returning();

      result.credit = creditResult;
    }

    return result;
  });

  return result;
}

export async function updateSubscriptionInTransaction({
  subscriptionNo,
  updateSubscription,
  newOrder,
  newCredit,
}: {
  subscriptionNo: string; // subscription unique id in table
  updateSubscription: UpdateSubscription;
  newOrder?: NewOrder;
  newCredit?: NewCredit;
}) {
  if (!subscriptionNo || !updateSubscription) {
    throw new Error('subscriptionNo and updateSubscription are required');
  }

  // only update order, no need transaction
  if (!newOrder && !newCredit) {
    return updateSubscriptionBySubscriptionNo(
      subscriptionNo,
      updateSubscription
    );
  }

  if (envConfigs.database_provider === 'd1') {
    return updateSubscriptionInD1({
      subscriptionNo,
      updateSubscription,
      newOrder,
      newCredit,
    });
  }

  // need transaction
  const result = await db().transaction(async (tx: any) => {
    let result: any = {
      order: null,
      subscription: null,
      credit: null,
    };

    let orderCreated = false;

    // deal with order
    if (newOrder) {
      let existingOrder: any = null;

      try {
        const [orderResult] = await tx
          .insert(order)
          .values(newOrder)
          .returning();

        existingOrder = orderResult;
        orderCreated = true;
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        if (!newOrder.transactionId || !newOrder.paymentProvider) {
          throw error;
        }

        const [existingOrderResult] = await tx
          .select()
          .from(order)
          .where(
            and(
              eq(order.transactionId, newOrder.transactionId),
              eq(order.paymentProvider, newOrder.paymentProvider)
            )
          );

        existingOrder = existingOrderResult;
      }

      result.order = existingOrder;
    }

    // deal with credit
    if (newCredit && orderCreated && result.order?.orderNo) {
      let existingCredit: any = null;
      const [creditResult] = await tx.insert(credit).values(newCredit).returning();

      existingCredit = creditResult;
      result.credit = existingCredit;
    }

    // update subscription
    const [subscriptionResult] = await tx
      .update(subscription)
      .set(updateSubscription)
      .where(eq(subscription.subscriptionNo, subscriptionNo))
      .returning();

    result.subscription = subscriptionResult;

    return result;
  });

  return result;
}

function normalizeGrantCreditForD1(newCredit: NewCredit): NewCredit {
  if (!newCredit.orderNo) {
    return newCredit;
  }

  return {
    ...newCredit,
    transactionNo: `grant:${newCredit.orderNo}`,
  };
}

async function findCreditByTransactionNo(transactionNo: string) {
  const [result] = await db()
    .select()
    .from(credit)
    .where(eq(credit.transactionNo, transactionNo))
    .limit(1);

  return result ?? null;
}

async function upsertSubscriptionForD1(newSubscription: NewSubscription) {
  await db().insert(subscription).values(newSubscription).onConflictDoNothing();

  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.subscriptionId, newSubscription.subscriptionId),
        eq(subscription.paymentProvider, newSubscription.paymentProvider)
      )
    )
    .limit(1);

  return result ?? null;
}

async function upsertGrantCreditForD1(newCredit: NewCredit) {
  const normalizedCredit = normalizeGrantCreditForD1(newCredit);

  await db().insert(credit).values(normalizedCredit).onConflictDoNothing();

  const existingCredit = await findCreditByTransactionNo(
    normalizedCredit.transactionNo
  );

  return existingCredit;
}

async function updateOrderInD1({
  orderNo,
  updateOrder,
  newSubscription,
  newCredit,
}: {
  orderNo: string;
  updateOrder: UpdateOrder;
  newSubscription?: NewSubscription;
  newCredit?: NewCredit;
}) {
  const result: any = {
    order: null,
    subscription: null,
    credit: null,
  };

  let currentOrder: any = null;

  if (updateOrder.status === OrderStatus.PAID) {
    const [updatedOrder] = await db()
      .update(order)
      .set(updateOrder)
      .where(
        and(
          eq(order.orderNo, orderNo),
          or(
            eq(order.status, OrderStatus.CREATED),
            eq(order.status, OrderStatus.PENDING)
          )
        )
      )
      .returning();

    if (updatedOrder) {
      currentOrder = updatedOrder;
    } else {
      const existingOrder = await findOrderByOrderNo(orderNo);
      if (!existingOrder || existingOrder.status !== OrderStatus.PAID) {
        console.log(
          `Order ${orderNo} already paid or not in CREATED status, skipping update`
        );
        return result;
      }
      currentOrder = existingOrder;
    }
  } else {
    currentOrder = await updateOrderByOrderNo(orderNo, updateOrder);
    if (!currentOrder) {
      return result;
    }
  }

  result.order = currentOrder;

  if (newSubscription) {
    result.subscription = await upsertSubscriptionForD1(newSubscription);

    if (
      result.order &&
      result.subscription?.subscriptionNo &&
      result.order.subscriptionNo !== result.subscription.subscriptionNo
    ) {
      const updatedOrder = await updateOrderByOrderNo(orderNo, {
        subscriptionNo: result.subscription.subscriptionNo,
      });

      result.order = updatedOrder ?? result.order;
    }
  }

  if (newCredit && result.order?.status === OrderStatus.PAID) {
    const creditToInsert = result.subscription?.subscriptionNo
      ? {
          ...newCredit,
          subscriptionNo: result.subscription.subscriptionNo,
        }
      : newCredit;

    result.credit = await upsertGrantCreditForD1(creditToInsert);
  }

  return result;
}

async function updateSubscriptionInD1({
  subscriptionNo,
  updateSubscription,
  newOrder,
  newCredit,
}: {
  subscriptionNo: string;
  updateSubscription: UpdateSubscription;
  newOrder?: NewOrder;
  newCredit?: NewCredit;
}) {
  const result: any = {
    order: null,
    subscription: null,
    credit: null,
  };

  if (newOrder) {
    try {
      await db().insert(order).values(newOrder).onConflictDoNothing();
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }

    if (newOrder.transactionId && newOrder.paymentProvider) {
      result.order = await findOrderByTransactionId({
        transactionId: newOrder.transactionId,
        paymentProvider: newOrder.paymentProvider,
      });
    }

    if (!result.order) {
      result.order = await findOrderByOrderNo(newOrder.orderNo);
    }
  }

  result.subscription = await updateSubscriptionBySubscriptionNo(
    subscriptionNo,
    updateSubscription
  );

  if (newCredit && result.order?.orderNo) {
    result.credit = await upsertGrantCreditForD1({
      ...newCredit,
      orderNo: result.order.orderNo,
    });
  }

  return result;
}
