export const warwickTheme = {
  colors: {
    primary: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7E22CE',  // Main Warwick purple
      800: '#6B21A8',
      900: '#581C87'
    },
    accent: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',  // Main Warwick gold
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F'
    },
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827'
    },
    semantic: {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    }
  },
  
  typography: {
    fonts: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem'
    }
  },
  
  spacing: {
    container: {
      padding: '1rem',
      maxWidth: '1280px'
    },
    section: {
      paddingY: '4rem'
    }
  },
  
  borderRadius: {
    sm: '0.375rem',
    DEFAULT: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px'
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
  },

  gradients: {
    hero: 'linear-gradient(135deg, #7E22CE 0%, #9333EA 50%, #F59E0B 100%)',
    card: 'linear-gradient(135deg, #FAF5FF 0%, #FFFBEB 100%)',
    button: 'linear-gradient(135deg, #7E22CE 0%, #9333EA 100%)'
  }
} as const

// CSS-in-JS helpers
export const tw = {
  // Common button styles
  button: {
    primary: 'bg-gradient-to-r from-purple-700 to-purple-600 text-white hover:from-purple-800 hover:to-purple-700 focus:ring-purple-500',
    secondary: 'bg-gold-500 text-purple-900 hover:bg-gold-600 focus:ring-gold-500',
    outline: 'border-2 border-purple-700 text-purple-700 hover:bg-purple-700 hover:text-white focus:ring-purple-500'
  },
  
  // Common card styles
  card: {
    default: 'bg-white rounded-lg shadow-md border border-gray-200',
    elevated: 'bg-white rounded-lg shadow-lg border border-gray-200',
    gradient: 'bg-gradient-to-br from-purple-50 to-gold-50 rounded-lg shadow-md border border-purple-200'
  },
  
  // Text styles
  text: {
    heading: 'font-bold text-gray-900',
    subheading: 'font-semibold text-gray-700',
    body: 'text-gray-600',
    muted: 'text-gray-500',
    brand: 'text-purple-700 font-semibold'
  }
}

// Design tokens for consistent spacing
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem'
} as const

// Breakpoints for responsive design
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const