export interface Player {
    subjectId?:string;
    userId?:string;
    username:string;
    displayName:string;
    status?:string;
}
export interface Session {
    player:Player | null;
    registrationEnabled?:boolean;
    returnUrl?:string;
}
export type Tone = 'success' | 'error';

export class PortalError extends Error {
    public readonly status:number;
    public readonly code?:string;
    public readonly retryAfter?:string | null;
    public readonly registrationEnabled?:boolean;
    public readonly banReason?:string;
    public readonly bannedUntil?:string | null;
    public constructor(message:string, response:Response, data:Record<string, unknown>) {
        super(message);
        this.status = response.status;
        this.code = typeof data.code === 'string' ? data.code : undefined;
        this.retryAfter = response.headers.get('retry-after');
        this.registrationEnabled =
            typeof data.registrationEnabled === 'boolean' ? data.registrationEnabled : undefined;
        this.banReason = typeof data.banReason === 'string' ? data.banReason : undefined;
        this.bannedUntil = typeof data.bannedUntil === 'string' ? data.bannedUntil : null;
    }
}

/** 页面只复用这个客户端，不接触服务密钥或 HttpOnly Cookie。 */
export class PortalClient {
    public readonly navigation:{ source:string; returnUrl:string };
    public constructor(search = location.search) {
        const query = new URLSearchParams(search);
        this.navigation = {
            source: query.get('source') || '',
            returnUrl: query.get('returnUrl') || '',
        };
    }
    private async request<T>(path:string, method = 'GET', body?:object):Promise<T> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(path, {
                method,
                credentials: 'same-origin',
                cache: 'no-store',
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            const parsed:unknown = await response.json().catch(() => null);
            const valid = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
            const data = valid ? (parsed as Record<string, unknown>) : {};
            if (!response.ok || !valid) {
                throw new PortalError(
                    typeof data.message === 'string'
                        ? data.message
                        : `请求失败（HTTP ${response.status}）`,
                    response,
                    data,
                );
            }
            return data as T;
        } finally {
            clearTimeout(timeout);
        }
    }
    public session():Promise<Session> {
        return this.request(`/api/auth/session?${new URLSearchParams(this.navigation)}`);
    }
    public login(username:string, password:string):Promise<Session> {
        return this.request('/api/auth/login', 'POST', { username, password, ...this.navigation });
    }
    public register(username:string, displayName:string, password:string):Promise<Session> {
        return this.request('/api/auth/register', 'POST', {
            username,
            displayName,
            password,
            ...this.navigation,
        });
    }
    public logout():Promise<{ loggedOut:boolean }> {
        return this.request('/api/auth/logout', 'POST', {});
    }
    public updateNickname(displayName:string):Promise<{ player:Player }> {
        return this.request('/api/auth/profile', 'PATCH', { displayName });
    }
    public changePassword(
        currentPassword:string,
        newPassword:string,
    ):Promise<{ changed:boolean; reloginRequired:boolean }> {
        return this.request('/api/auth/password', 'POST', { currentPassword, newPassword });
    }
    public static message(error:unknown):string {
        if (error instanceof PortalError && error.banReason !== undefined) {
            return `${error.message}\n封禁原因：${error.banReason || '未说明'}\n封禁期限：${error.bannedUntil ? new Date(error.bannedUntil).toLocaleString('zh-CN') : '永久'}`;
        }
        if (error instanceof Error && error.name === 'AbortError') {
            return '请求超时，请稍后重试；不要连续重复提交。';
        }
        return error instanceof Error ? error.message : '请求失败，请稍后重试';
    }
}
