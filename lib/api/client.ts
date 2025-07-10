'use client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export interface ApiError {
  message: string
  status: number
  code?: string
}

export class ApiClientError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Get auth token client-side
    const token = typeof window !== 'undefined' && window.Clerk ? 
      await window.Clerk.session?.getToken() : 
      null

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      } as HeadersInit
    }

    // Handle FormData - don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      const headers = config.headers as Record<string, string>
      delete headers['Content-Type']
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config)
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      let errorCode: string | undefined

      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
        errorCode = errorData.code
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage
      }

      throw new ApiClientError(errorMessage, response.status, errorCode)
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error
    }

    // Network or other errors
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Network error',
      0
    )
  }
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) => 
    apiClient<T>(endpoint, { method: 'GET', ...options }),
  
  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) => 
    apiClient<T>(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options
    }),
  
  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) => 
    apiClient<T>(endpoint, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options
    }),
  
  patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) => 
    apiClient<T>(endpoint, {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options
    }),
  
  delete: <T = any>(endpoint: string, options?: RequestInit) => 
    apiClient<T>(endpoint, { method: 'DELETE', ...options })
}