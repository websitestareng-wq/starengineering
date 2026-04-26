import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../../mail/mail.service";
import { ReminderStatus, ReminderType } from "@prisma/client";

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}
  private parseDateOnlyToISTDate(value: string | Date) {
  if (value instanceof Date) return value;

  const [year, month, day] = String(value).split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}
  private getNextWeeklyDate(currentDueDate: Date, weeklyDays: string[]) {
    if (!weeklyDays?.length) return currentDueDate;

    const dayMap: Record<string, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    const selectedDays = weeklyDays
      .map((day) => dayMap[day])
      .filter((value) => value !== undefined)
      .sort((a, b) => a - b);

    if (!selectedDays.length) return currentDueDate;

    const current = new Date(currentDueDate);
    const currentDay = current.getDay();

    const nextDay = selectedDays.find((day) => day > currentDay);
    const diff =
      nextDay !== undefined
        ? nextDay - currentDay
        : 7 - currentDay + selectedDays[0];

   const next = new Date(
  current.getFullYear(),
  current.getMonth(),
  current.getDate() + diff,
  12,
  0,
  0,
  0,
);
return next;
  }

  private getNextMonthlyDate(currentDueDate: Date, monthlyDay?: number | null) {
    if (!monthlyDay) return currentDueDate;

    const current = new Date(currentDueDate);
   const next = new Date(
  current.getFullYear(),
  current.getMonth() + 1,
  monthlyDay,
  12,
  0,
  0,
  0,
);
    return next;
  }

  private getNextYearlyDate(
    currentDueDate: Date,
    yearlyMonth?: number | null,
    yearlyDay?: number | null,
  ) {
    if (!yearlyMonth || !yearlyDay) return currentDueDate;

    const current = new Date(currentDueDate);
   return new Date(
  current.getFullYear() + 1,
  yearlyMonth - 1,
  yearlyDay,
  12,
  0,
  0,
  0,
);
  }
async create(data: any, userId?: string) {
  const due = this.parseDateOnlyToISTDate(data.dueDate);

  return this.prisma.reminder.create({
    data: {
      title: data.title,
      notes: data.notes,
      type: data.type,
      dueDate: due,
      weeklyDays: data.weeklyDays || [],
      monthlyDay: data.monthlyDay,
      yearlyMonth: data.yearlyMonth,
      yearlyDay: data.yearlyDay,

      notifyHour:
        data.notifyHour !== undefined && data.notifyHour !== null
          ? data.notifyHour
          : due.getHours(),

      notifyMinute:
        data.notifyMinute !== undefined && data.notifyMinute !== null
          ? data.notifyMinute
          : due.getMinutes(),

emailEnabled: data.emailEnabled ?? true,
lastNotifiedAt: null,
createdById: userId,
    },
  });
}

  async findAll(query?: {
    status?: ReminderStatus;
    type?: ReminderType;
    category?: string;
  }) {
    return this.prisma.reminder.findMany({
      where: {
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.type ? { type: query.type } : {}),
        ...(query?.category ? { category: query.category } : {}),
      },
      orderBy: {
        dueDate: "asc",
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.reminder.findUnique({
      where: { id },
    });
  }

async update(id: string, data: any) {
  const due = new Date(data.dueDate);

  return this.prisma.reminder.update({
    where: { id },
    data: {
      title: data.title,
      notes: data.notes,
      type: data.type,
      dueDate: due,
      weeklyDays: data.weeklyDays || [],
      monthlyDay: data.monthlyDay,
      yearlyMonth: data.yearlyMonth,
      yearlyDay: data.yearlyDay,

      notifyHour:
        data.notifyHour !== undefined && data.notifyHour !== null
          ? data.notifyHour
          : due.getHours(),

      notifyMinute:
        data.notifyMinute !== undefined && data.notifyMinute !== null
          ? data.notifyMinute
          : due.getMinutes(),

      emailEnabled: data.emailEnabled,
    },
  });
}

  async delete(id: string) {
    return this.prisma.reminder.delete({
      where: { id },
    });
  }

  async markCompleted(id: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: {
        status: ReminderStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async markActive(id: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: {
        status: ReminderStatus.ACTIVE,
        completedAt: null,
      },
    });
  }

  async stopSeries(id: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: {
        status: ReminderStatus.STOPPED,
        stoppedAt: new Date(),
        isSeriesStopped: true,
      },
    });
  }

async processDueReminders() {
  const now = new Date();

  const getISTParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      dateKey: `${map.year}-${map.month}-${map.day}`,
    };
  };

  const compareDateKeys = (a: string, b: string) => {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  };

  const nowIST = getISTParts(now);

  const reminders = await this.prisma.reminder.findMany({
    where: {
      emailEnabled: true,
      status: {
        not: ReminderStatus.STOPPED,
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  for (const reminder of reminders) {
    const dueDate = new Date(reminder.dueDate);
    const dueIST = getISTParts(dueDate);

    const notifyHour =
      reminder.notifyHour ?? dueIST.hour;

    const notifyMinute =
      reminder.notifyMinute ?? dueIST.minute;

    const dateComparison = compareDateKeys(nowIST.dateKey, dueIST.dateKey);

    if (dateComparison < 0) continue;

    if (dateComparison === 0) {
      const nowTotalMinutes = nowIST.hour * 60 + nowIST.minute;
      const notifyTotalMinutes = notifyHour * 60 + notifyMinute;

      if (nowTotalMinutes < notifyTotalMinutes) continue;
    }

    if (reminder.lastNotifiedAt) {
      const lastNotifiedIST = getISTParts(new Date(reminder.lastNotifiedAt));

      if (lastNotifiedIST.dateKey === nowIST.dateKey) continue;
    }

    try {
      await this.mailService.sendReminderEmail({
        to: "corporate@stareng.co.in",
        title: reminder.title,
        notes: reminder.notes || "",
      });

      console.log(`[Reminder] Email sent: ${reminder.title}`);

    } catch (error) {
      console.error("[Reminder] sendReminderEmail failed:", error);
      continue;
    }

    if (reminder.type === ReminderType.ONE_TIME) {
      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          lastNotifiedAt: new Date(),
        },
      });
      continue;
    }

    let nextDueDate = reminder.dueDate;

    if (reminder.type === ReminderType.WEEKLY) {
      nextDueDate = this.getNextWeeklyDate(reminder.dueDate, reminder.weeklyDays);
    }

    if (reminder.type === ReminderType.MONTHLY) {
      nextDueDate = this.getNextMonthlyDate(reminder.dueDate, reminder.monthlyDay);
    }

    if (reminder.type === ReminderType.YEARLY) {
      nextDueDate = this.getNextYearlyDate(
        reminder.dueDate,
        reminder.yearlyMonth,
        reminder.yearlyDay,
      );
    }

    await this.prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        dueDate: nextDueDate,
        lastNotifiedAt: new Date(),
      },
    });
  }
}

  async cleanupCompleted() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    await this.prisma.reminder.deleteMany({
      where: {
        type: ReminderType.ONE_TIME,
        status: ReminderStatus.COMPLETED,
        completedAt: {
          lt: cutoff,
        },
      },
    });
  }
}