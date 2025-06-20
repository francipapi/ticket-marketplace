# Ticket Marketplace - Phase 0 Prototype

A secure peer-to-peer marketplace for buying and selling digital event tickets with fraud prevention and automated delivery.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up database
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📋 Demo Accounts

- **Alice**: alice@example.com (password: password123)
- **Bob**: bob@example.com (password: password123)

## ✨ Features

### Phase 0 (Current)
- ✅ User registration and authentication (JWT)
- ✅ Ticket listing creation and management
- ✅ Structured offer system (no free text)
- ✅ File upload with watermarking
- ✅ Mock payment processing
- ✅ User dashboard
- ✅ Responsive design
- ✅ SQLite database for simplicity

### Phase 1 (Next)
- 🔄 Supabase integration (PostgreSQL + Auth + Storage)
- 🔄 Real-time notifications
- 🔄 Enhanced security with RLS policies
- 🔄 Stripe Connect payments
- 🔄 Email notifications

## 🛠 Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (Phase 0) → PostgreSQL (Phase 1)
- **ORM**: Prisma
- **Authentication**: JWT (Phase 0) → Supabase Auth (Phase 1)
- **File Storage**: Local (Phase 0) → Supabase Storage (Phase 1)
- **Validation**: Zod
- **UI Components**: Lucide React icons
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
ticket-marketplace/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── listings/          # Listing pages
│   ├── dashboard/         # User dashboard
│   └── providers.tsx      # Context providers
├── components/            # Reusable UI components
├── lib/                   # Utilities and services
│   ├── auth.ts           # Authentication service
│   ├── db.ts             # Database client
│   ├── upload.ts         # File upload service
│   └── validations.ts    # Zod schemas
├── migration/            # Phase 0 → 1 migration tools
├── prisma/               # Database schema and seeds
└── public/uploads/       # Local file storage
```

## 🔧 Available Scripts

```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run db:push         # Push schema to database
npm run db:seed         # Seed with test data
npm run db:reset        # Reset database and reseed
npm run db:studio       # Open Prisma Studio
npm run migration:export # Export data for Phase 1
npm run migration:verify # Verify migration integrity
npm run type-check      # TypeScript type checking
npm run clean           # Clean build artifacts
npm run fresh           # Fresh install and setup
```

## 🔒 Security Features

- JWT authentication with httpOnly cookies
- Password hashing with bcrypt (12 rounds)
- File type and size validation
- Structured offer templates (no XSS)
- Input validation with Zod schemas
- SQL injection protection with Prisma

## 📊 Database Schema

### Users
- Email, username, password hash
- Migration metadata for Phase 1 transition

### Listings
- Event details, pricing (in cents), quantity
- File paths for ticket uploads
- Status tracking (active, sold, inactive)

### Offers
- Structured message templates only
- Price negotiation without free text
- Status tracking (pending, accepted, rejected)

## 🎯 User Flows

### Selling Tickets
1. Register/Login → Dashboard
2. Create Listing → Upload ticket files
3. Receive offers → Accept/reject offers
4. Automatic delivery after payment

### Buying Tickets
1. Browse listings → Find desired tickets
2. Make structured offer → Wait for acceptance
3. Complete mock payment → Download tickets

## 🔄 Migration to Phase 1

When ready for production:

```bash
# Export Phase 0 data
npm run migration:export

# Set up Supabase project
# Update environment variables
# Import data to Supabase
npm run migration:import

# Verify migration
npm run migration:verify
```

See [docs/MIGRATION.md](docs/MIGRATION.md) for detailed instructions.

## 🚦 Development Workflow

1. **Phase 0**: Validate concept with minimal infrastructure
2. **Phase 1**: Migrate to production services (Supabase)
3. **Phase 2**: Add real payments (Stripe Connect)
4. **Phase 3**: Scale with advanced features

## 📈 Performance Considerations

- Database queries optimized with indexes
- File uploads with size/type validation
- Efficient API design with pagination
- Image watermarking for fraud prevention
- Responsive design for mobile

## 🔍 Testing

Manual testing checklist:

- [ ] User registration and login
- [ ] Listing creation with file upload
- [ ] Making and responding to offers
- [ ] Mock payment flow
- [ ] Dashboard functionality
- [ ] Mobile responsiveness

## 🚀 Deployment

Phase 0 can be deployed to:
- Vercel (recommended)
- Netlify
- Railway
- Any Node.js hosting

## 📄 License

This project is created for educational and demonstration purposes.

## 🤝 Contributing

This is a prototype implementation. For production use:
1. Complete Phase 1 migration
2. Add comprehensive testing
3. Implement proper monitoring
4. Add legal compliance features

---

**Note**: This is Phase 0 - a working prototype for concept validation. For production use, migrate to Phase 1 with proper infrastructure and security measures.