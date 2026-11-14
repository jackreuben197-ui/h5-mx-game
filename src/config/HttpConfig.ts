/** MX HTTP only. WS belongs to the external H5 shell and uses its bridge. */
export class HttpConfig {
  static readonly baseUrl = import.meta.env?.VITE_MX_API_BASE_URL || 'https://test2.awanptest.com/api';
  static readonly timeoutMs = 10000;
}
