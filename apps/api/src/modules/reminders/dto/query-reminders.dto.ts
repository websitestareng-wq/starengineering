import { IsEnum, IsOptional } from "class-validator";
import { ReminderStatus, ReminderType } from "@prisma/client";

export class QueryRemindersDto {
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType;
}