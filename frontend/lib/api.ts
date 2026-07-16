// Browser: same-origin /api/v1 (nginx or Next rewrites).
// Server (SSR): Node cannot fetch relative URLs — call Django via BACKEND_URL.
function resolveApiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
  if (typeof window !== 'undefined') {
    return publicUrl
  }
  if (publicUrl.startsWith('http://') || publicUrl.startsWith('https://')) {
    return publicUrl
  }
  const backend = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
  const path = publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`
  return `${backend}${path}`
}

const API_URL = resolveApiBaseUrl()

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token')
    }
  }

  setToken(token: string | null) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('access_token', token)
      } else {
        localStorage.removeItem('access_token')
      }
    }
  }

  /** Persist login/register session tokens (access + refresh). */
  setSession(accessToken: string | null, refreshToken?: string | null) {
    this.setToken(accessToken)
    if (typeof window === 'undefined') return
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    } else if (refreshToken === null || !accessToken) {
      localStorage.removeItem('refresh_token')
    }
  }

  clearSession() {
    this.setToken(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refresh_token')
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    const refresh = localStorage.getItem('refresh_token')
    if (!refresh) return false
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
          credentials: 'include',
        })
        if (!response.ok) {
          this.clearSession()
          return false
        }
        const data = await response.json()
        this.setSession(data.access_token, data.refresh_token)
        return true
      } catch {
        this.clearSession()
        return false
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  async logout(): Promise<void> {
    const refresh =
      typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
    try {
      if (refresh) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
          credentials: 'include',
        })
      }
    } catch {
      // ignore network errors on logout
    }
    this.clearSession()
  }

  private async request(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestInit = {},
    retried = false
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
      // Public server-rendered GETs use ISR by default. Authenticated dashboard
      // requests run in the browser and are never placed in Next's data cache.
      ...(method === 'GET' && typeof window === 'undefined'
        ? { next: { revalidate: 300 } }
        : {}),
      ...options,
    }

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }))
        const detail = error.detail || error.message || 'Request failed'
        const isAuthFailure =
          response.status === 401 ||
          (response.status === 403 &&
            typeof detail === 'string' &&
            detail.toLowerCase().includes('credential'))

        if (isAuthFailure && !retried && !endpoint.includes('/auth/')) {
          const refreshed = await this.refreshAccessToken()
          if (refreshed) {
            return this.request(method, endpoint, data, options, true)
          }
          this.clearSession()
        }

        throw new Error(typeof detail === 'string' ? detail : 'Request failed')
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }

      return null
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      }
      if (error.message) {
        throw error
      }
      throw new Error('Network error')
    }
  }

  async get(endpoint: string, options?: RequestInit): Promise<any> {
    return this.request('GET', endpoint, undefined, options)
  }

  async post(endpoint: string, data?: any, options?: RequestInit): Promise<any> {
    return this.request('POST', endpoint, data, options)
  }

  async put(endpoint: string, data?: any, options?: RequestInit): Promise<any> {
    return this.request('PUT', endpoint, data, options)
  }

  async patch(endpoint: string, data?: any, options?: RequestInit): Promise<any> {
    return this.request('PATCH', endpoint, data, options)
  }

  async delete(endpoint: string, options?: RequestInit): Promise<any> {
    return this.request('DELETE', endpoint, undefined, options)
  }

  /** Multipart upload (do not set JSON Content-Type). */
  async upload(endpoint: string, formData: FormData): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {}
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          return this.upload(endpoint, formData)
        }
        this.clearSession()
      }
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail || error.message || 'Upload failed')
    }
    return response.json()
  }
}

export const api = new ApiClient(API_URL)
