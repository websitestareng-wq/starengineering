import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { TransactionTypeDto } from "./create-transaction.dto";
import {
  EntrySideDto,
  TransactionBillRowDto,
} from "./transaction-bill-row.dto";

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  voucherNo?: string;

  @IsOptional()
  @IsDateString()
  voucherDate?: string;

  @IsOptional()
  @IsEnum(TransactionTypeDto)
  type?: TransactionTypeDto;

  @IsOptional()
  @IsEnum(EntrySideDto)
  side?: EntrySideDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  particulars?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === "true" || value === "1" || value === 1) {
      return true;
    }

    if (
      value === false ||
      value === "false" ||
      value === "0" ||
      value === 0 ||
      value === "" ||
      value == null
    ) {
      return false;
    }

    return value;
  })
  @IsBoolean()
  sendEmail?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  partyId?: string;

  @IsOptional()
  @IsString()
  createdById?: string;

  @IsOptional()
  @Transform(({ value }) => {
    const parseMaybeJson = (input: unknown) => {
      if (typeof input !== "string") return input;

      try {
        return JSON.parse(input);
      } catch {
        return input;
      }
    };

    const normalizeRow = (row: unknown) => {
      const parsed = parseMaybeJson(row);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return parsed;
      }

      const data = parsed as Record<string, unknown>;

      return {
        allocationType: data.allocationType ?? data.type ?? undefined,
        side: data.side ?? undefined,
        refNo: data.refNo ?? undefined,
        againstBillRowId: data.againstBillRowId ?? undefined,
        amount: data.amount != null ? Number(data.amount) : undefined,
      };
    };

    const parsedValue = parseMaybeJson(value);

    if (Array.isArray(parsedValue)) {
      return parsedValue.map(normalizeRow);
    }

    return parsedValue;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionBillRowDto)
  billRows?: TransactionBillRowDto[];
}