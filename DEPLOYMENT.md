# 🚀 Deployment Guide

This guide walks you through deploying the Ticket Marketplace to Vercel with PostgreSQL.

## 📋 Prerequisites

- GitHub account with your repository
- Vercel account (free tier works)
- Your local development environment working

## 🔧 Step 1: Prepare for Deployment

### 1.1 Push to GitHub

Make sure your code is pushed to GitHub:
```bash
git push origin main
```

### 1.2 Test Locally

Ensure everything works locally:
```bash
npm run dev
# Test core functionality:
# - Registration/Login
# - Create listing
# - Make offer
# - Accept offer
# - Payment flow
```

## 🌐 Step 2: Deploy to Vercel

### 2.1 Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your `ticket-marketplace` repository from GitHub
4. Leave build settings as default (Vercel auto-detects Next.js)
5. Click "Deploy"

### 2.2 Initial Deployment

The first deployment will fail due to missing environment variables - this is expected!

## 🗃️ Step 3: Set Up Database

### 3.1 Add Vercel Postgres

1. In your Vercel project dashboard, go to "Storage" tab
2. Click "Create Database" 
3. Select "Postgres"
4. Choose a database name (e.g., `ticket-marketplace-db`)
5. Select your preferred region
6. Click "Create"

### 3.2 Get Database Connection

1. After creation, go to the database details
2. Copy the connection string from "DATABASE_URL"
3. It should look like: `postgresql://username:password@host:port/database`

## ⚙️ Step 4: Configure Environment Variables

### 4.1 Set Environment Variables in Vercel

Go to your project → Settings → Environment Variables and add:

| Variable | Value | Notes |
|----------|-------|--------|
| `NODE_ENV` | `production` | Sets production mode |
| `DATABASE_URL` | `postgresql://...` | From Vercel Postgres |
| `JWT_SECRET` | `[generate-new-32-char-string]` | **Generate a new secure key** |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel app URL |
| `MOCK_PAYMENTS` | `true` | Keep mock payments for demo |
| `PLATFORM_FEE_PERCENT` | `6` | Platform fee percentage |
| `MAX_FILE_SIZE` | `10485760` | 10MB file limit |
| `ALLOWED_FILE_TYPES` | `application/pdf,image/jpeg,image/png` | Allowed uploads |

### 4.2 Generate Secure JWT Secret

Generate a new JWT secret for production:
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Online generator
# Visit: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
```

**⚠️ Important**: Never use your development JWT secret in production!

## 🗄️ Step 5: Set Up Production Database

### 5.1 Deploy Database Schema

After setting environment variables, trigger a new deployment:

1. Go to your Vercel project → Deployments
2. Click "Redeploy" on the latest deployment
3. The deployment should now succeed

### 5.2 Initialize Database Tables

Use Vercel's function environment to set up the database:

**Option A: Via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Set up database
vercel env pull .env.production
npm run db:deploy
```

**Option B: Via GitHub Action (Automated)**

The included CI workflow will automatically run database migrations on successful deployments.

**Option C: Manual via Vercel Functions**

Create a temporary API route to initialize the database:

1. Create `app/api/setup/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // This will create all tables
    await prisma.$connect();
    return NextResponse.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
```

2. Visit `https://your-app.vercel.app/api/setup` once
3. Delete the setup route after use

## ✅ Step 6: Verify Deployment

### 6.1 Test Core Functionality

1. Visit your Vercel app URL
2. Test on both desktop and mobile
3. Verify all features work:
   - [ ] User registration
   - [ ] User login
   - [ ] Browse listings
   - [ ] Create new listing
   - [ ] Make offer
   - [ ] Accept/reject offer
   - [ ] Mock payment
   - [ ] Download tickets

### 6.2 Check Database

1. Go to Vercel → Storage → Your Database
2. Use the "Query" tab to verify data:
```sql
SELECT * FROM users LIMIT 5;
SELECT * FROM listings LIMIT 5;
SELECT * FROM offers LIMIT 5;
```

## 📱 Step 7: Mobile Testing

### 7.1 Test Responsive Design

1. Open your Vercel URL on mobile devices
2. Test all functionality on different screen sizes
3. Verify touch interactions work properly

### 7.2 Performance Testing

1. Use Google PageSpeed Insights: `https://pagespeed.web.dev/`
2. Enter your Vercel URL
3. Optimize any performance issues

## 🔧 Step 8: Custom Domain (Optional)

### 8.1 Add Custom Domain

1. Go to Vercel project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` environment variable

## 📊 Step 9: Monitoring & Analytics

### 9.1 Vercel Analytics

1. Go to project → Analytics tab
2. Enable Vercel Analytics for usage insights

### 9.2 Error Monitoring

Consider adding error monitoring:
- Sentry for error tracking
- LogRocket for user session recording
- Vercel's built-in logging

## 🚨 Troubleshooting

### Common Issues:

**Database Connection Issues:**
```bash
# Check if DATABASE_URL is correctly set
vercel env ls

# Test database connection
npm run db:deploy
```

**Build Failures:**
```bash
# Check build logs in Vercel dashboard
# Common fixes:
npm run type-check  # Fix TypeScript errors
npm run lint       # Fix linting errors
```

**Environment Variable Issues:**
- Ensure all required variables are set
- Redeploy after adding new variables
- Check variable naming (case-sensitive)

**File Upload Issues:**
- Vercel has a 4.5MB limit for serverless functions
- Consider using external storage for production

## 🔄 Step 10: Ongoing Maintenance

### 10.1 Regular Updates

```bash
# Update dependencies
npm update

# Test locally
npm run build

# Deploy
git push origin main
```

### 10.2 Database Backups

Set up regular database backups through Vercel's Storage interface.

### 10.3 Security Monitoring

- Regularly update dependencies
- Monitor for security vulnerabilities
- Review access logs

## 🎯 Production Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] Database schema deployed and working
- [ ] Core functionality tested on production
- [ ] Mobile responsiveness verified
- [ ] Performance optimized
- [ ] Error monitoring set up
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate working
- [ ] GDPR/Privacy compliance reviewed
- [ ] Terms of service and privacy policy added

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review database connection in Vercel Storage
3. Test with fresh environment variables
4. Refer to the troubleshooting section above
5. Open a GitHub issue for bugs

---

**Your ticket marketplace is now live! 🎫✨**