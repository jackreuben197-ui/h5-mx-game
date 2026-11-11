import { HttpConfig } from '../../config/HttpConfig.js';
import { HttpError } from './HttpError.js';
export interface HttpOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}
/** CC wire contract: POST JSON, md5at token, optional X-Club, {code,message,data}. */
export class HttpClient {
  constructor(
    private token: () => string,
    private options: HttpOptions = {},
  ) {}
  async request<T>(
    path: string,
    body: unknown = {},
    options: { signal?: AbortSignal; clubID?: number } = {},
  ): Promise<T> {
    if (!path.startsWith('/api/') || path.includes('..') || /[?#\\]/.test(path))
      throw new Error('HTTP 接口必须是 /api/ 下的路径');
    const token = this.token();
    if (!token) throw new Error('请先登录');
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.throwIfAborted();
    options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(
      () => controller.abort(new DOMException('HTTP 请求超时', 'TimeoutError')),
      this.options.timeoutMs ?? HttpConfig.timeoutMs,
    );
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', md5at: token };
      if (options.clubID) headers['X-Club'] = String(options.clubID);
      const base = (this.options.baseUrl ?? HttpConfig.baseUrl).replace(/\/$/, '');
      const response = await (this.options.fetch ?? fetch)(base + path.slice(4), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok)
        throw new HttpError(`HTTP 请求失败（${response.status}）`, -1, response.status);
      const envelope = (await response.json()) as { code?: number; message?: string; data?: T };
      if (typeof envelope.code !== 'number') throw new HttpError('HTTP 响应格式无效', -1);
      if (envelope.code !== 0)
        throw new HttpError(envelope.message || `请求失败（${envelope.code}）`, envelope.code);
      if (token !== this.token()) throw new DOMException('登录会话已变更', 'AbortError');
      controller.signal.throwIfAborted();
      return envelope.data as T;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }
}
