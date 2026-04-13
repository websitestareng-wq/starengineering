import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RemindersService } from "./reminders.service";

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(private readonly remindersService: RemindersService) {}

  // हर 1 minute due reminders check karega
  @Cron(CronExpression.EVERY_MINUTE)
  async handleDueReminders() {
    try {
      await this.remindersService.processDueReminders();
    } catch (error) {
      this.logger.error("Failed to process due reminders", error);
    }
  }

  // रोज रात completed one-time reminders cleanup
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleCleanup() {
    try {
      await this.remindersService.cleanupCompleted();
    } catch (error) {
      this.logger.error("Failed to cleanup completed reminders", error);
    }
  }
}