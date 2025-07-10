'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        },
        classNames: {
          toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-gray-600',
          actionButton: 'group-[.toast]:bg-purple-700 group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-gray-100 group-[.toast]:text-gray-600',
          closeButton: 'group-[.toast]:bg-gray-100 group-[.toast]:text-gray-600 group-[.toast]:border-gray-200'
        }
      }}
    />
  )
}