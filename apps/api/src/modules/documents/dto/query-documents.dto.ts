import { IsOptional, IsString } from "class-validator";

export class QueryDocumentsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  folderName?: string;
}