import { Module } from "@nestjs/common";
import { RemindersService } from "./reminders.service";
import { RemindersController } from "./reminders.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { MailModule } from "../../mail/mail.module";
import { RemindersScheduler } from "./reminders.scheduler";
@Module({
  providers: [RemindersService, RemindersScheduler],
  imports: [PrismaModule, MailModule],
  controllers: [RemindersController],
  exports: [RemindersService],
})
export class RemindersModule {}