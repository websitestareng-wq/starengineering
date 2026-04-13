import type {
  CreateUserPayload,
  PortalUser,
  UpdateUserPayload,
  UserStatusFilter,
  UsersResponse,
} from "@/types/user";
import { apiRequest } from "./api-client";
function getAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("accessToken") || "";
}
export async function getUsers(params: {
  search?: string;
  status?: UserStatusFilter;
}) {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }

  const qs = searchParams.toString();
  return apiRequest<UsersResponse>(`/users${qs ? `?${qs}` : ""}`, {
  method: "GET",
  token: getAccessToken(),
});
}

export async function createUser(payload: CreateUserPayload) {
  return apiRequest<PortalUser>("/users", {
  method: "POST",
  body: JSON.stringify(payload),
  token: getAccessToken(),
});
}

export async function updateUser(userId: string, payload: UpdateUserPayload) {
 return apiRequest<PortalUser>(`/users/${userId}`, {
  method: "PATCH",
  body: JSON.stringify(payload),
  token: getAccessToken(),
});
}
export async function deleteUser(userId: string) {
  return apiRequest<void>(`/users/${userId}`, {
  method: "DELETE",
  token: getAccessToken(),
});
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
return apiRequest<PortalUser>(`/users/${userId}/status`, {
  method: "PATCH",
  body: JSON.stringify({ isActive }),
  token: getAccessToken(),
});
}

export async function sendUserCredentials(userId: string) {
 return apiRequest<void>(`/users/${userId}/send-credentials`, {
  method: "POST",
  token: getAccessToken(),
});
}
