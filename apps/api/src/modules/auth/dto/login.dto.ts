import { IsOptional, IsString } from "class-validator";

export class LoginDto {
  @IsString()
  emailOrPhone: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  secretKey?: string;

  @IsOptional()
  @IsString()
  captchaToken?: string;
}