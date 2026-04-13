import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  EntrySideDto,
  TransactionBillRowDto,
} from "./transaction-bill-row.dto";

export enum TransactionTypeDto {
  SALES = "SALES",
  PURCHASE = "PURCHASE",
  PAYMENT = "PAYMENT",
  RECEIPT = "RECEIPT",
  DEBIT_NOTE = "DEBIT_NOTE",
  CREDIT_NOTE = "CREDIT_NOTE",
  JOURNAL_DR = "JOURNAL_DR",
  JOURNAL_CR = "JOURNAL_CR",
}

export class CreateTransactionDto {
  @IsString()
  @MinLength(1)
  voucherNo!: string;

  @IsDateString()
  voucherDate!: string;

  @IsEnum(TransactionTypeDto)
  type!: TransactionTypeDto;

  @IsEnum(EntrySideDto)
  side!: EntrySideDto;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  @MinLength(1)
  particulars!: string;

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

  @IsString()
  @MinLength(1)
  partyId!: string;

  @IsOptional()
  @IsString()
  createdById?: string;

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

    return [];
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransactionBillRowDto)
  billRows!: TransactionBillRowDto[];
}