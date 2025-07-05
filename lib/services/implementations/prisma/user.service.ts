// Prisma User Service Implementation (Stub)
// TODO: Implement actual Prisma integration when needed

import { 
  UserService, 
  AppUser, 
  CreateUserData, 
  UpdateUserData 
} from '../../interfaces/database.interface'

export class PrismaUserService implements UserService {
  constructor() {
    console.log('🏭 Initializing PrismaUserService (stub implementation)')
  }

  async create(data: CreateUserData): Promise<AppUser> {
    throw new Error('PrismaUserService not implemented yet. Use AirtableUserService instead.')
  }

  async findById(id: string): Promise<AppUser | null> {
    throw new Error('PrismaUserService not implemented yet. Use AirtableUserService instead.')
  }

  async findByClerkId(clerkId: string): Promise<AppUser | null> {
    throw new Error('PrismaUserService not implemented yet. Use AirtableUserService instead.')
  }

  async findByEmail(email: string): Promise<AppUser | null> {
    throw new Error('PrismaUserService not implemented yet. Use AirtableUserService instead.')
  }

  async update(id: string, data: UpdateUserData): Promise<AppUser> {
    throw new Error('PrismaUserService not implemented yet. Use AirtableUserService instead.')
  }

  async delete(id: string): Promise<boolean> {
    throw new Error('PrismaUserService not implemented yet. Use AirtableUserService instead.')
  }

  async incrementTotalSales(id: string, amount: number): Promise<AppUser> {
    throw new Error('PrismaUserService not implemented yet. Use AirtableUserService instead.')
  }
}