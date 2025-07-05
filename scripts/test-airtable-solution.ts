import Airtable from 'airtable'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Initialize Airtable
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID)

async function testSolution() {
  console.log('\n🔧 Testing Airtable Filter Solution\n')
  console.log('='.repeat(80))
  
  try {
    // Find existing users with listings
    console.log('📊 Analyzing existing data...\n')
    
    const users = await base('Users').select({
      maxRecords: 10,
      fields: ['email', 'username', 'clerkId']
    }).firstPage()
    
    console.log(`Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`  - ${user.get('email')} (${user.get('username')}) - Record ID: ${user.id}`)
    })
    
    // Get existing listings
    const listings = await base('Listings').select({
      maxRecords: 10,
      fields: ['title', 'seller', 'status']
    }).firstPage()
    
    console.log(`\nFound ${listings.length} listings:`)
    listings.forEach(listing => {
      const seller = listing.get('seller')
      console.log(`  - ${listing.get('title')} - Seller: ${JSON.stringify(seller)}`)
    })
    
    // Test the working solution
    console.log('\n' + '='.repeat(80))
    console.log('\n✅ Testing Working Solution: Filter by Email\n')
    console.log('='.repeat(80))
    
    // Find a user with listings
    const testUser = users.find(user => user.get('email') === 'alice@example.com')
    if (!testUser) {
      console.log('❌ Test user alice@example.com not found')
      return
    }
    
    const testUserId = testUser.id
    const testUserEmail = testUser.get('email') as string
    
    console.log(`\n🎯 Testing with user: ${testUserEmail} (${testUserId})`)
    
    // Test the working filter approaches
    const workingSolutions = [
      {
        name: 'Direct Email Comparison',
        formula: `{seller} = "${testUserEmail}"`,
        description: 'Filter by email address (primary field of linked record)'
      },
      {
        name: 'FIND Email in seller',
        formula: `FIND("${testUserEmail}", ARRAYJOIN({seller})) > 0`,
        description: 'Search for email in joined seller field'
      }
    ]
    
    for (const solution of workingSolutions) {
      console.log(`\n📌 Solution: ${solution.name}`)
      console.log(`   Formula: ${solution.formula}`)
      console.log(`   Description: ${solution.description}`)
      
      const startTime = Date.now()
      const results = await base('Listings').select({
        filterByFormula: solution.formula,
        maxRecords: 100
      }).firstPage()
      const duration = Date.now() - startTime
      
      console.log(`   Results: ${results.length} listings found`)
      console.log(`   Duration: ${duration}ms`)
      
      if (results.length > 0) {
        console.log(`   ✅ SUCCESS`)
        results.forEach(listing => {
          console.log(`     - ${listing.get('title')} (${listing.id})`)
        })
      } else {
        console.log(`   ❌ No results`)
      }
    }
    
    // Test the improved getUserListings function
    console.log('\n' + '='.repeat(80))
    console.log('\n🔧 Testing Improved getUserListings Function\n')
    console.log('='.repeat(80))
    
    console.log('\n📝 Here\'s the corrected function code:')
    console.log(`
export async function getUserListings(userId: string, filters: ListingFilters = {}): Promise<ListingWithSeller[]> {
  console.log('🔍 getUserListings called with:', { userId, filters })
  
  try {
    // Get user first to get their email (primary field)
    const user = await this.executeWithRateLimit(async () => {
      const users = await this.getTable(AIRTABLE_TABLES.USERS)
        .select({
          filterByFormula: \`{clerkId} = "\${userId}"\`,
          maxRecords: 1
        })
        .firstPage()
      
      if (users.length === 0) {
        throw new Error(\`User not found: \${userId}\`)
      }
      
      return users[0]
    })
    
    const userEmail = user.get('email') as string
    const userRecordId = user.id
    
    console.log(\`📧 User found: \${userEmail} (Record ID: \${userRecordId})\`)
    
    // Build filter using email instead of record ID
    let filterParts: string[] = []
    
    // Use email for seller filtering (this is the key fix!)
    filterParts.push(\`{seller} = "\${userEmail}"\`)
    
    // Add other filters
    if (filters.status) {
      filterParts.push(\`{status} = "\${filters.status}"\`)
    }
    
    if (filters.eventName) {
      filterParts.push(\`FIND("\${filters.eventName}", {eventName}) > 0\`)
    }
    
    const filterFormula = filterParts.length > 1 
      ? \`AND(\${filterParts.join(', ')})\`
      : filterParts[0]
    
    console.log(\`🔍 Filter formula: \${filterFormula}\`)
    
    // Execute the query
    const listings = await this.executeWithRateLimit(async () => {
      return await this.getTable(AIRTABLE_TABLES.LISTINGS)
        .select({
          filterByFormula: filterFormula,
          sort: [{ field: 'eventDate', direction: 'desc' }],
          maxRecords: 100
        })
        .firstPage()
    })
    
    console.log(\`✅ Found \${listings.length} listings\`)
    
    // Transform results
    const results: ListingWithSeller[] = listings.map(record => {
      const listing = this.transformFromAirtableFields('listings', record)
      
      return {
        ...listing,
        seller: {
          id: userRecordId,
          email: userEmail,
          username: user.get('username') as string,
          rating: user.get('rating') as number || 5.0
        }
      }
    })
    
    return results
    
  } catch (error) {
    console.error('❌ Error in getUserListings:', error)
    throw error
  }
}
    `)
    
    console.log('\n' + '='.repeat(80))
    console.log('\n📊 Summary of Findings:\n')
    console.log('='.repeat(80))
    
    console.log('🔍 Root Cause Analysis:')
    console.log('  - The seller field in Listings table is a linked record field')
    console.log('  - Airtable linked record fields display the primary field (email) for filtering')
    console.log('  - Record IDs are stored internally but not used for filtering')
    console.log('  - This is standard Airtable behavior for linked record fields')
    
    console.log('\n✅ Working Solutions:')
    console.log('  1. Filter by email: {seller} = "user@example.com"')
    console.log('  2. FIND with email: FIND("user@example.com", ARRAYJOIN({seller})) > 0')
    
    console.log('\n❌ Non-Working Approaches:')
    console.log('  1. Filter by record ID: {seller} = "recXXXXXXXXXXXXXX"')
    console.log('  2. FIND with record ID: FIND("recXXXXXXXXXXXXXX", ARRAYJOIN({seller})) > 0')
    
    console.log('\n🔧 Required Fix:')
    console.log('  - Update getUserListings to get user email first')
    console.log('  - Use email for filtering instead of record ID')
    console.log('  - This maintains the same API but fixes the filtering logic')
    
    console.log('\n📈 Performance Impact:')
    console.log('  - Minimal: One additional user lookup per request')
    console.log('  - Can be optimized with caching in production')
    console.log('  - Alternative: Store user email in listings directly')
    
    console.log('\n' + '='.repeat(80))
    console.log('\n🎯 Next Steps:')
    console.log('  1. Update the getUserListings function in airtable/listing.service.ts')
    console.log('  2. Test the fix with the existing test scripts')
    console.log('  3. Update any other functions that filter by seller field')
    console.log('  4. Consider adding user email caching for better performance')
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
console.log('🚀 Starting Solution Testing...')
testSolution()