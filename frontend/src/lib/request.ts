export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

export class RequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse(response: Response) {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { body, auth = true, headers, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined) requestHeaders.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: requestHeaders,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth) {
    if (!retried && (await refreshAccessToken())) {
      return request<T>(path, options, true);
    }
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : "Request failed";
    throw new RequestError(message, response.status);
  }

  return data as T;
}
