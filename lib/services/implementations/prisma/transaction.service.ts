// Prisma Transaction Service Implementation (Stub)
// TODO: Implement actual Prisma integration when needed

import { 
  TransactionService, 
  AppTransaction, 
  CreateTransactionData, 
  UpdateTransactionData,
  TransactionFilters,
  PaginatedTransactions 
} from '../../interfaces/database.interface'

export class PrismaTransactionService implements TransactionService {
  constructor() {
    console.log('🏭 Initializing PrismaTransactionService (stub implementation)')
  }

  async create(data: CreateTransactionData): Promise<AppTransaction> {
    throw new Error('PrismaTransactionService not implemented yet. Use AirtableTransactionService instead.')
  }

  async findById(id: string): Promise<AppTransaction | null> {
    throw new Error('PrismaTransactionService not implemented yet. Use AirtableTransactionService instead.')
  }

  async findMany(filters: TransactionFilters): Promise<PaginatedTransactions> {
    throw new Error('PrismaTransactionService not implemented yet. Use AirtableTransactionService instead.')
  }

  async findByOfferId(offerId: string): Promise<AppTransaction | null> {
    throw new Error('PrismaTransactionService not implemented yet. Use AirtableTransactionService instead.')
  }

  async update(id: string, data: UpdateTransactionData): Promise<AppTransaction> {
    throw new Error('PrismaTransactionService not implemented yet. Use AirtableTransactionService instead.')
  }

  async updateStatus(id: string, status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'): Promise<AppTransaction> {
    throw new Error('PrismaTransactionService not implemented yet. Use AirtableTransactionService instead.')
  }

  async completeTransaction(id: string, stripePaymentId: string): Promise<AppTransaction> {
    throw new Error('PrismaTransactionService not implemented yet. Use AirtableTransactionService instead.')
  }

  async failTransaction(id: string, reason?: string): Promise<AppTransaction> {
    throw new Error('PrismaTransactionService not implemented yet. Use AirtableTransactionService instead.')
  }
}