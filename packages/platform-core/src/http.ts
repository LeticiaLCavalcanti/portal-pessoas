import type { JourneyHttp } from '@portal/journey-contract';

export interface HttpOptions {
  baseUrl: string;
  getToken: () => string;
  /** Id de correlação da SESSÃO. Amarra shell -> jornada -> BFF -> APIs. */
  correlationId: string;
  /** Quem está chamando. Permite ao BFF cobrar SLO por jornada, não por "frontend". */
  journeyId?: string;
}

export function createHttpClient(opts: HttpOptions): JourneyHttp {
  const call = async <T>(method: string, path: string, body?: unknown, init: RequestInit = {}): Promise<T> => {
    const res = await fetch(`${opts.baseUrl}${path}`, {
      ...init,
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${opts.getToken()}`,
        'x-correlation-id': opts.correlationId,
        ...(opts.journeyId ? { 'x-journey-id': opts.journeyId } : {}),
        ...(init.headers ?? {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!res.ok) {
      throw Object.assign(new Error(`HTTP ${res.status} em ${path}`), {
        status: res.status,
        correlationId: opts.correlationId
      });
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  };

  return {
    get: (path, init) => call('GET', path, undefined, init),
    post: (path, body, init) => call('POST', path, body, init)
  };
}
