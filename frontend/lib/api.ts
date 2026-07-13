// Prefer same-origin /api/v1 (nginx or Next rewrites). Override only when API is on another host.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

class ApiClient {
  private baseUrl: string
  private token: string | null = null

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

  private async request(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestInit = {}
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
        if (
          response.status === 401 ||
          (response.status === 403 &&
            typeof detail === 'string' &&
            detail.toLowerCase().includes('credential'))
        ) {
          this.setToken(null)
        }
        throw new Error(detail)
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }
      
      return null
    } catch (error: any) {
      // Handle network errors (CORS, connection refused, etc.)
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

  async delete(endpoint: string, options?: RequestInit): Promise<any> {
    return this.request('DELETE', endpoint, undefined, options)
  }
}

export const api = new ApiClient(API_URL)
