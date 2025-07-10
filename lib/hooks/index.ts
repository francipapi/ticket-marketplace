import { useState, useCallback } from 'react'

// Re-export all hooks for easy importing
export * from './use-listings'
export * from './use-offers'
export * from './use-user'
export * from './use-search'

// Additional utility hooks
export { default as useDebounce } from './use-debounce'
export { default as useLocalStorage } from './use-local-storage'

// Custom hook for handling form submissions with loading states
export function useFormSubmission<T = any>() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (
    submitFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await submitFn()
      onSuccess?.(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return {
    isSubmitting,
    error,
    handleSubmit,
    clearError: () => setError(null)
  }
}