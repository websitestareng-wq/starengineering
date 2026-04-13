import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { ReminderType } from "@prisma/client";

export class CreateReminderDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(ReminderType)
  type!: ReminderType;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  weeklyDays?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  monthlyDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  yearlyMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  yearlyDay?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  notifyHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  notifyMinute?: number;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsString()
  createdById?: string;
}