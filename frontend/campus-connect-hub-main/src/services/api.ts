import { mockRequest } from "@/mocks/adapter";

const configuredUrl = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

export const getBaseUrl = (): string => {
  if (!configuredUrl) return "";
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && configuredUrl.includes("localhost")) {
    return configuredUrl.replace("localhost", window.location.hostname);
  }
  return configuredUrl;
};

/** Mock mode is on whenever no backend URL is configured. */
export const isMockMode = !configuredUrl;

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cc_token");
}

async function request<T>(method: Method, path: string, body?: unknown, isRetry = false): Promise<T> {
  if (isMockMode) return mockRequest<T>(method, path, body);
  let token = await getAuthToken();
  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch (netErr: any) {
    // If backend is unreachable or offline, fallback to mock system seamlessly
    console.warn(`[API] Backend unreachable at ${getBaseUrl()}${path}, falling back to mock:`, netErr?.message || netErr);
    return mockRequest<T>(method, path, body);
  }
  if (res.status === 401 && !isRetry && typeof window !== "undefined") {
    localStorage.removeItem("cc_token");
    token = await getAuthToken();
    if (token) {
      return request<T>(method, path, body, true);
    }
  }
  if (!res.ok) {
    let msg: any = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson?.message) {
        if (typeof errJson.message === "object" && errJson.message !== null) {
          msg = errJson.message.message || errJson.message.error || JSON.stringify(errJson.message);
        } else {
          msg = errJson.message;
        }
      } else if (errJson?.error) {
        msg = errJson.error;
      }
    } catch { /* ignore */ }
    const formattedMsg = Array.isArray(msg) ? msg.join(", ") : (typeof msg === "object" ? JSON.stringify(msg) : String(msg));
    throw new ApiError(res.status, formattedMsg);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  if (json && typeof json === "object" && "data" in json && "success" in json) {
    const payload = json.data;
    if (payload && typeof payload === "object") {
      if ((payload as any).accessToken && !(payload as any).token) {
        (payload as any).token = (payload as any).accessToken;
      }
      if ("items" in payload && Array.isArray((payload as any).items)) {
        return (payload as any).items as T;
      }
      if ("data" in payload && Array.isArray((payload as any).data)) {
        return (payload as any).data as T;
      }
      if ("notifications" in payload && Array.isArray((payload as any).notifications)) {
        return (payload as any).notifications as T;
      }
    }
    return payload as T;
  }
  return json as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
  patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b),
  put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b),
  delete: <T>(p: string) => request<T>("DELETE", p),
};
