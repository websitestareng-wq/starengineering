import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { TransactionTypeDto } from "./create-transaction.dto";

export class QueryTransactionsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  partyId?: string;

  @IsOptional()
  @IsEnum(TransactionTypeDto)
  type?: TransactionTypeDto;
}