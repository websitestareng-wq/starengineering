import { Type } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export enum BillAllocationTypeDto {
  NEW_REF = "NEW_REF",
  AGAINST_REF = "AGAINST_REF",
  ADVANCE = "ADVANCE",
  ON_ACCOUNT = "ON_ACCOUNT",
}

export enum EntrySideDto {
  DR = "DR",
  CR = "CR",
}

export class TransactionBillRowDto {
  @IsEnum(BillAllocationTypeDto)
  allocationType!: BillAllocationTypeDto;

  @IsOptional()
  @IsEnum(EntrySideDto)
  side?: EntrySideDto;

  @IsOptional()
  @IsString()
  refNo?: string;

  @IsOptional()
  @IsString()
  againstBillRowId?: string;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Amount must be a valid number with up to 2 decimal places." },
  )
  @Min(0, { message: "Amount cannot be negative." })
  amount!: number;
}