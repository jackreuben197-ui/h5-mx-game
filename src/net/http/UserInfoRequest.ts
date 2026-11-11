import { HttpClient } from './HttpClient.js';
export interface UserInfo {
  un_id: number;
  nickname: string;
  avatar: string;
  [key: string]: unknown;
}
export class UserInfoRequest {
  constructor(private http: HttpClient) {}
  execute(signal?: AbortSignal): Promise<{ user: UserInfo }> {
    return this.http.request('/api/user/info', {}, { signal });
  }
}
