import type { FieldErrors } from "./records";

export class ClientRequestError extends Error {
  fields?: FieldErrors;
  code?: string;
  today?: string;

  constructor(message: string, details: { fields?: FieldErrors; code?: string; today?: string } = {}) {
    super(message);
    this.name = "ClientRequestError";
    Object.assign(this, details);
  }
}

export async function requestJson<Result>(url: string, options: RequestInit = {}): Promise<Result> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      cache: "no-store",
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)])
        : AbortSignal.timeout(20_000),
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ClientRequestError("لم يستجب الخادم. بياناتك المدخلة محفوظة في الصف؛ تحقق من الاتصال وحاول مجدداً.");
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ClientRequestError("أعاد الخادم استجابة غير متوقعة. حاول مجدداً.");
  }
  if (!response.ok) {
    throw new ClientRequestError(body.error || "تعذّر إكمال الطلب.", body);
  }
  return body as Result;
}
