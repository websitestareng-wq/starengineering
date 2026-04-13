import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";
import { TransactionsEmailService } from "./transactions-email.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { MailModule } from "../../mail/mail.module";
import { CommonModule } from "../../common/common.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MailModule,
    CommonModule, // IMPORTANT
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsEmailService],
  exports: [TransactionsService, TransactionsEmailService],
})
export class TransactionsModule {}