import { Module } from "@nestjs/common";
import { R2Service } from "./services/r2.service";

@Module({
  providers: [R2Service],
  exports: [R2Service],
})
export class CommonModule {}