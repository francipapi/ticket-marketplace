# 🎫 Ticket Marketplace

A secure, full-featured ticket marketplace built with Next.js 14. This is a Phase 0 prototype designed for easy migration to production-ready infrastructure.

![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)

## ✨ Features

### Core Functionality
- 🔐 **Secure Authentication** - JWT-based auth with password hashing
- 🎟️ **Ticket Listings** - Create, edit, delete ticket listings
- 💬 **Offer System** - Make offers, negotiate prices, accept/reject
- 💳 **Payment Processing** - Mock payment system (ready for Stripe integration)
- 📱 **Responsive Design** - Mobile-first, works on all devices
- 📂 **File Upload** - Secure ticket file uploads with watermarking
- 🏠 **User Dashboard** - Manage your listings and offers

### Technical Features
- ⚡ **Next.js 14** with App Router and Server Components
- 🗃️ **SQLite/PostgreSQL** database with Prisma ORM
- 🎨 **Tailwind CSS** for responsive styling
- 🔒 **Input validation** with Zod schemas
- 📸 **File handling** with local storage (migration-ready)
- 🔄 **Real-time updates** for offers and payments

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ticket-marketplace.git
cd ticket-marketplace

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Set up the database
npx prisma generate
npx prisma db push

# Seed the database (optional)
npx prisma db seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing instructions.

### Quick Test
1. Register a new account
2. Create a ticket listing
3. Make an offer (from another account)
4. Accept the offer and complete payment
5. Download tickets

## 🏗️ Architecture

### Phase 0 (Current)
- **Frontend**: Next.js 14 with TypeScript
- **Database**: SQLite (local) / PostgreSQL (production)
- **Auth**: JWT with bcrypt
- **Storage**: Local file system
- **Payments**: Mock system

### Phase 1 (Migration Ready)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Storage**: Supabase Storage
- **Payments**: Stripe integration
- **Deployment**: Vercel

## 📁 Project Structure

```
ticket-marketplace/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── listings/          # Ticket listings
│   └── offers/            # Offer management
├── components/            # Reusable components
├── lib/                   # Utilities and configurations
├── prisma/               # Database schema and migrations
├── migration/            # Phase 1 migration tools
└── docs/                 # Documentation
```

## 🔐 Environment Variables

```bash
# Required
JWT_SECRET=your-super-secret-key
DATABASE_URL=your-database-url
NEXTAUTH_URL=http://localhost:3000

# Optional
MOCK_PAYMENTS=true
PLATFORM_FEE_PERCENT=6
MAX_FILE_SIZE=10485760
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy!

The app is migration-ready for PostgreSQL databases.

## 🔄 Migration Path

This Phase 0 prototype is designed for easy migration to production:

1. **Database**: SQLite → PostgreSQL (schema compatible)
2. **Auth**: JWT → Supabase Auth
3. **Storage**: Local → Supabase Storage
4. **Payments**: Mock → Stripe

See [docs/MIGRATION.md](./docs/MIGRATION.md) for detailed migration guide.

## 🛠️ Built With

- [Next.js 14](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Prisma](https://www.prisma.io/) - Database ORM
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide React](https://lucide.dev/) - Icons
- [React Hook Form](https://react-hook-form.com/) - Form handling
- [React Hot Toast](https://react-hot-toast.com/) - Notifications

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Built with ❤️ using Claude Code**