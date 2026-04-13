import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class BulkSendTransactionEmailDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  transactionIds!: string[];
}