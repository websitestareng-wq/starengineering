export type PortalRole = "SUPER_ADMIN" | "ADMIN_VIEWER" | "USER";

export type IdentifyPortalPayload = {
  emailOrPhone: string;
  password: string;
};

export type IdentifyPortalResponse = {
  role: PortalRole;
  requiresSecretKey: boolean;
};

export type AdminLoginPayload = {
  emailOrPhone: string;
  password: string;
  secretKey: string;
  captchaToken: string;
};

export type UserLoginPayload = {
  emailOrPhone: string;
  password: string;
  captchaToken: string;
};

export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  role: PortalRole;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
};