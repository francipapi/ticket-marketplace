# Complete Testing Guide

## 🚀 Quick Start

1. **Open your browser** and go to: http://localhost:3000
2. **Demo accounts available**:
   - Email: `alice@example.com` | Password: `password123`
   - Email: `bob@example.com` | Password: `password123`

## 🧪 Complete Testing Flow

### Step 1: Test the Homepage
1. Visit http://localhost:3000
2. You should see:
   - Hero section with "Buy & Sell Event Tickets Safely"
   - Features section
   - "How It Works" section
   - Navigation bar at the top

### Step 2: Test User Registration
1. Click **"Sign Up"** in the navigation
2. Fill out the form:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `password123`
3. Click **"Create account"**
4. You should be automatically logged in and redirected to the dashboard

### Step 3: Test User Login
1. If you're logged in, click the logout icon (arrow) in the navigation
2. Click **"Login"** in the navigation
3. Try the demo account:
   - Email: `alice@example.com`
   - Password: `password123`
4. Click **"Sign in"**
5. You should be redirected to the dashboard

### Step 4: Browse Existing Listings
1. Click **"Browse Tickets"** in the navigation
2. You should see 2 existing listings:
   - Taylor Swift Concert - Floor Seats ($250.00)
   - Coachella Weekend 1 - General Admission ($400.00)
3. Try the search box - type "Taylor" or "concert"
4. Click on a listing to view details

### Step 5: Create a New Listing (Full Flow)
1. Go to Dashboard or click **"Sell Tickets"**
2. Click **"Create Listing"** or **"Sell Tickets"**
3. Fill out the form:
   - **Title**: "Ed Sheeran Concert - VIP Seats"
   - **Event Name**: "Ed Sheeran Mathematics Tour"
   - **Event Date**: Choose a future date (e.g., 2024-08-15T20:00)
   - **Venue**: "Wembley Stadium"
   - **Price**: 180 (this is $1.80 in the form, stored as 18000 cents)
   - **Quantity**: 2
   - **Description**: "Amazing VIP seats with meet & greet"

4. **Test File Upload**:
   - Click the file upload area
   - Upload any PDF or image file (it will be watermarked)
   - You should see upload progress

5. Click **"Create Listing"**
6. You should be redirected and see a success message

### Step 6: Test Making an Offer
1. **Login as a different user**:
   - Logout (click arrow icon)
   - Login as `bob@example.com` / `password123`

2. **Find a listing to make an offer on**:
   - Go to "Browse Tickets"
   - Click on any active listing (not your own)

3. **Make an offer**:
   - Click "Make Offer" button
   - Choose message template:
     - "I'll buy at asking price" - offers the full listing price
     - "I offer $X" - allows custom price input
     - "Is this still available?" - just checks availability
   - If choosing custom price, enter amount (e.g., 150 for $1.50)
   - Select quantity (1-2)
   - Click "Submit Offer"

### Step 7: Test Responding to Offers
1. **Switch back to the seller account**:
   - Logout and login as the listing owner
   - Or create a new account and list tickets, then switch to buyer

2. **View received offers**:
   - Go to Dashboard
   - Look for "Received Offers" section
   - Or check the listing detail page

3. **Respond to an offer**:
   - Click "Accept" or "Reject"
   - If you accept, the offer status changes to "accepted"

### Step 8: Test Mock Payment Flow
1. **As the buyer** (who made the accepted offer):
   - Go to Dashboard
   - Find your accepted offer
   - Click "Pay Now" or similar button

2. **Complete mock payment**:
   - Fill out the fake payment form
   - Click "Complete Payment"
   - You should see success message
   - The offer status changes to "completed"

3. **Download tickets**:
   - After payment, you should see download links
   - Click to download the original ticket files

### Step 9: Test Dashboard Features
1. **Visit Dashboard** (http://localhost:3000/dashboard)
2. **Check sections**:
   - Your listings (if you created any)
   - Your offers (sent and received)
   - Quick action buttons
   - Statistics

### Step 10: Test File Upload & Watermarking
1. **Create a new listing with an image file**
2. **Upload a JPEG or PNG image**
3. **Check the uploads folder**:
   ```bash
   ls -la public/uploads/[your-user-id]/
   ```
4. **You should see**:
   - Original file
   - Watermarked version (if image)

## 🔍 Things to Test

### Navigation & UI
- [ ] All navigation links work
- [ ] Responsive design on mobile (resize browser)
- [ ] Forms validate properly (try empty fields)
- [ ] Error messages display correctly
- [ ] Success notifications appear

### Authentication
- [ ] Registration with new account
- [ ] Login with existing account
- [ ] Logout functionality
- [ ] Protected routes redirect to login
- [ ] Session persistence (refresh page while logged in)

### Listings
- [ ] Create listing with all fields
- [ ] Create listing with minimal fields
- [ ] Edit your own listing
- [ ] Cannot edit others' listings
- [ ] Delete your own listing
- [ ] Search functionality
- [ ] Pagination (if more than 10 listings)

### Offers
- [ ] Make offer at asking price
- [ ] Make offer with custom price
- [ ] Make offer asking availability
- [ ] Accept offers as seller
- [ ] Reject offers as seller
- [ ] Cannot make offer on own listing
- [ ] Cannot make duplicate offers

### File Upload
- [ ] Upload PDF files
- [ ] Upload image files (JPG, PNG)
- [ ] Try uploading invalid file types (should fail)
- [ ] Try uploading files too large (should fail)
- [ ] Watermarking on images

### Mock Payments
- [ ] Payment form appears for accepted offers
- [ ] Mock payment completes successfully
- [ ] Ticket download becomes available
- [ ] Transaction status updates correctly

## 🐛 Common Issues & Solutions

### "Database not found"
```bash
npm run db:push
npm run db:seed
```

### "Cannot connect to server"
```bash
npm run dev
```

### "Authentication required"
- Make sure you're logged in
- Try logging out and back in

### "File upload failed"
- Check file size (max 10MB)
- Check file type (PDF, JPG, PNG only)
- Make sure uploads directory exists

### No data showing
```bash
npm run db:seed  # Adds demo data
```

## 📱 Mobile Testing

1. **Resize browser window** to mobile size
2. **Or use browser dev tools** (F12 → Device toolbar)
3. **Test all functionality** on mobile screen sizes
4. **Check touch interactions** work properly

## 🔧 Advanced Testing

### Database Testing
```bash
npm run db:studio  # Opens Prisma Studio to view data
```

### Migration Testing
```bash
npm run migration:export    # Export current data
npm run migration:verify    # Verify export integrity
```

### Build Testing
```bash
npm run build              # Test production build
npm run type-check         # Check TypeScript
```

## 📊 Expected Results

After testing, you should have:
- [ ] Multiple user accounts
- [ ] Several listings with different details
- [ ] Offers in various states (pending, accepted, rejected, completed)
- [ ] Files uploaded to `public/uploads/`
- [ ] Successful mock transactions
- [ ] Understanding of complete user flow

## 🎯 Success Criteria

The testing is successful if:
1. **Users can register and login** without errors
2. **Listings can be created** with file uploads
3. **Offers can be made and responded to** using templates
4. **Mock payments complete** the transaction flow
5. **Files are properly** uploaded and watermarked
6. **Dashboard shows** accurate user data
7. **All navigation** works correctly
8. **Mobile interface** is functional

## 🚀 Next Steps

Once testing is complete:
1. **Review the data** in Prisma Studio
2. **Check migration tools** work correctly
3. **Plan Phase 1 migration** when ready for production
4. **Deploy to Vercel** for live testing (optional)

---

**Need help?** Check the browser console (F12) for any error messages, or review the server logs in your terminal.