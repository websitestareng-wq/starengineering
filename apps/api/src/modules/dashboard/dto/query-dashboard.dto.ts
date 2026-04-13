import { Transform } from "class-transformer";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class QueryDashboardDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value ?? "").trim())
  partyId?: string;
}