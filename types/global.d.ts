// Global type declarations

interface Window {
  Clerk?: {
    session?: {
      getToken(): Promise<string | null>
    }
  }
}

// Extend the global Window interface
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken(): Promise<string | null>
      }
    }
  }
}