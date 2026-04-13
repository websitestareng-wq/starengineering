export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
}

type RequestOptions = RequestInit & {
  token?: string;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, body, ...rest } = options;

  const isFormData = body instanceof FormData;

  const finalHeaders = new Headers(headers || {});

  if (!isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (token && !finalHeaders.has("Authorization")) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    body,
    headers: finalHeaders,
    cache: "no-store",
    credentials: "include",
  });
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data: unknown = null;

  if (isJson) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => "");
    data = text || null;
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      Array.isArray((data as { message?: unknown }).message)
        ? String((data as { message: unknown[] }).message[0] || "Request failed.")
        : data &&
            typeof data === "object" &&
            "message" in data &&
            (data as { message?: unknown }).message
          ? String((data as { message: unknown }).message)
          : "Request failed.";

    throw new Error(message);
  }

  return data as T;
}