export type UserStatusFilter = "all" | "active" | "inactive";

export type PortalUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastCredentialSentAt?: string | null;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  address: string;
  sendCredentials: boolean;
};

export type UpdateUserPayload = {
  name: string;
  email: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  address: string;
};

export type UsersResponse = {
  items: PortalUser[];
  total: number;
};