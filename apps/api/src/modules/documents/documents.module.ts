import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { R2Service } from "../../common/services/r2.service";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, R2Service],
  exports: [DocumentsService],
})
export class DocumentsModule {}