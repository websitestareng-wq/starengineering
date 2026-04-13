import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { MailModule } from "./mail/mail.module";
import { UsersModule } from "./modules/users/users.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { R2Service } from "./common/services/r2.service";
import { DocumentsModule } from "./modules/documents/documents.module";
import { RemindersModule } from "./modules/reminders/reminders.module";
import { ScheduleModule } from "@nestjs/schedule";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { PublicController } from "./modules/public/public.controller";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "apps/api/.env",
    }),
    ScheduleModule.forRoot(),
    DashboardModule,
    PrismaModule,
    AuthModule,
    MailModule,
    UsersModule,
    TransactionsModule,
    DocumentsModule,
    RemindersModule,
  ],
  controllers: [PublicController],
  providers: [R2Service],
  exports: [R2Service],
})
export class AppModule {}