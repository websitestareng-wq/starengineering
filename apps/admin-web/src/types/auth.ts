export type UserRole = "SUPER_ADMIN" | "ADMIN_VIEWER";

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
}

export interface LoginPayload {
  emailOrPhone: string;
  password: string;
  secretKey: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}