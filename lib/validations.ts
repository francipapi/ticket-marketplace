import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Listing schemas
export const createListingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  eventName: z.string().min(3, 'Event name must be at least 3 characters'),
  eventDate: z.string().datetime('Invalid date format'),
  venue: z.string().optional(),
  price: z.number().min(100, 'Price must be at least $1.00').max(100000, 'Price must be less than $1,000'), // in cents
  quantity: z.number().min(1, 'Quantity must be at least 1').max(10, 'Quantity must be less than 10'),
  description: z.string().optional(),
});

export const updateListingSchema = createListingSchema.partial();

// Offer schemas
export const createOfferSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  offerPrice: z.number().min(100, 'Offer must be at least $1.00'), // in cents
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  messageTemplate: z.enum(['asking_price', 'make_offer', 'check_availability'], {
    errorMap: () => ({ message: 'Invalid message template' }),
  }),
  customMessage: z.string().max(200, 'Message must be less than 200 characters').optional(),
});

export const respondToOfferSchema = z.object({
  response: z.enum(['accept', 'reject'], {
    errorMap: () => ({ message: 'Response must be accept or reject' }),
  }),
});

// File upload schema
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File must be less than 10MB')
    .refine(
      (file) => ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type),
      'File must be PDF, JPEG, or PNG'
    ),
});

// Environment validation
export const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  UPLOAD_DIR: z.string().default('./public/uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().positive()).default('10485760'),
  ALLOWED_FILE_TYPES: z.string().default('application/pdf,image/jpeg,image/png'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type RespondToOfferInput = z.infer<typeof respondToOfferSchema>;