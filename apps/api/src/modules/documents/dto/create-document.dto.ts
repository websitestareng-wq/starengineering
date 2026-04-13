import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  folderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  remindBeforeDays?: number;

  @IsOptional()
  @IsString()
  uploadedById?: string;
}