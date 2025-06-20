# Contributing to Ticket Marketplace

Thank you for your interest in contributing to the Ticket Marketplace! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Git

### Setup Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ticket-marketplace.git
   cd ticket-marketplace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add comments for complex logic

### Commit Messages
Follow the conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates

## 🧪 Testing

### Before Submitting
1. **Type check**: `npm run type-check`
2. **Lint**: `npm run lint`
3. **Build**: `npm run build`
4. **Manual testing**: Test your changes thoroughly

### Testing Checklist
- [ ] Authentication works (login/register)
- [ ] Listings can be created/edited/deleted
- [ ] Offers can be made/accepted/rejected
- [ ] Payment flow works
- [ ] File uploads work
- [ ] Mobile responsive
- [ ] No console errors

## 📝 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-documented code
   - Follow existing patterns and conventions
   - Add tests if applicable

3. **Test your changes**
   ```bash
   npm run type-check
   npm run lint
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - Add testing instructions

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Additional Notes
Any additional information or context
```

## 🐛 Reporting Bugs

Use the GitHub issue template for bug reports. Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots if applicable

## 💡 Suggesting Features

Use the GitHub issue template for feature requests. Include:
- Problem description
- Proposed solution
- Alternative considerations
- Additional context

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

## 🔧 Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run db:push` - Push database schema
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

## 📞 Getting Help

- Open a GitHub issue for bugs or feature requests
- Check existing issues and discussions
- Review the documentation in the `/docs` folder

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉