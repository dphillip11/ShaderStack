export interface BackendShader {
  id: string;
  ownerId?: string;
  title: string;
  code: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ShaderListResponse {
  items: BackendShader[];
  total: number;
  limit: number;
  offset: number;
  query?: string;
}

export class BackendClient {
  private token: string | null;
  private base: string;
  
  constructor(base = '/api') {
    this.base = base;
    this.token = localStorage.getItem('authToken');
  }
  
  setToken(t: string) { this.token = t; localStorage.setItem('authToken', t); }
  
  get authHeader(): Record<string, string> { 
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {}; 
  }

  async login(username: string, password: string) {
    const res = await fetch(`${this.base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (!res.ok) throw new Error('login failed');
    const data = await res.json();
    this.setToken(data.token);
    return data;
  }
  async register(username: string, password: string) {
    const res = await fetch(`${this.base}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (!res.ok) throw new Error('register failed');
    const data = await res.json();
    this.setToken(data.token);
    return data;
  }
  async listShaders(q = '', limit = 20, offset = 0): Promise<ShaderListResponse> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const res = await fetch(`${this.base}/shaders?${params.toString()}`);
    if (!res.ok) throw new Error('list failed');
    return res.json();
  }
  async getShader(id: string): Promise<BackendShader> {
    const res = await fetch(`${this.base}/shaders/${id}`);
    if (!res.ok) throw new Error('not found');
    return res.json();
  }
  async createShader(title: string, code: string, tags: string[]): Promise<BackendShader> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...this.authHeader };
    const res = await fetch(`${this.base}/shaders`, { method: 'POST', headers, body: JSON.stringify({ title, code, tags }) });
    if (res.status === 401) throw new Error('auth');
    if (!res.ok) throw new Error('create failed');
    return res.json();
  }
  async updateShader(id: string, patch: { title?: string; code?: string; tags?: string[] }): Promise<BackendShader> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...this.authHeader };
    const res = await fetch(`${this.base}/shaders/${id}`, { method: 'PUT', headers, body: JSON.stringify(patch) });
    if (res.status === 401) throw new Error('auth');
    if (!res.ok) throw new Error('update failed');
    return res.json();
  }
}
