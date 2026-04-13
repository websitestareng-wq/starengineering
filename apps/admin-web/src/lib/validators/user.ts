export type UserRole = "SUPER_ADMIN" | "ADMIN" | "PROPRIETOR" | "CLIENT";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type UserItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  gstin?: string | null;
  pan?: string | null;
  fullAddress?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UsersListResponse = {
  items: UserItem[];
  total: number;
  page: number;
  limit: number;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  gstin?: string;
  pan?: string;
  fullAddress: string;
  sendWelcomeEmail?: boolean;
};

export type UpdateUserPayload = {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  gstin?: string;
  pan?: string;
  fullAddress: string;
  sendWelcomeEmail?: boolean;
};

export type UsersQuery = {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
};