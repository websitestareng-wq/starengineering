import type {
  AdminLoginPayload,
  AuthResponse,
  IdentifyPortalPayload,
  IdentifyPortalResponse,
  UserLoginPayload,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined.");
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      data.message
        ? String(data.message)
        : "Request failed.";

    throw new Error(message);
  }

  return data as T;
}
export async function logoutPortal(): Promise<{ success: true }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  return parseJson<{ success: true }>(response);
}
export async function identifyPortalUser(
  payload: IdentifyPortalPayload
): Promise<IdentifyPortalResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/portal/identify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      emailOrPhone: payload.emailOrPhone,
      password: payload.password,
    }),
  });

  return parseJson<IdentifyPortalResponse>(response);
}

export async function loginAdmin(
  payload: AdminLoginPayload
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      emailOrPhone: payload.emailOrPhone,
      password: payload.password,
      secretKey: payload.secretKey,
      captchaToken: payload.captchaToken,
    }),
  });

  return parseJson<AuthResponse>(response);
}

export async function loginUser(
  payload: UserLoginPayload
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      emailOrPhone: payload.emailOrPhone,
      password: payload.password,
      captchaToken: payload.captchaToken,
    }),
  });

  return parseJson<AuthResponse>(response);
}
export async function recoverCredential(payload: { emailOrPhone: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/recover-credential`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      emailOrPhone: payload.emailOrPhone,
    }),
  });

  return parseJson<{ message: string }>(response);
}