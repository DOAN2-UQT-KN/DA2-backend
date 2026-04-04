import { NotificationType, type Notification } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class NotificationService {
  async listForUser(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number },
  ): Promise<{ items: Notification[]; unreadCount: number }> {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);

    const whereBase = {
      userId,
      type: NotificationType.WEBSITE,
      ...(options?.unreadOnly ? { readAt: null } : {}),
    };

    const [items, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: whereBase,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, type: NotificationType.WEBSITE, readAt: null },
      }),
    ]);

    return { items, unreadCount };
  }

  async markRead(userId: string, id: string): Promise<Notification | null> {
    const existing = await prisma.notification.findFirst({
      where: {
        id,
        userId,
        type: NotificationType.WEBSITE,
      },
    });
    if (!existing) {
      return null;
    }
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}

export const notificationService = new NotificationService();
