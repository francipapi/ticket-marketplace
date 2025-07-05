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

interface FilterTest {
  name: string
  formula: string
  description: string
}

async function testAirtableFilters() {
  console.log('\n🔍 Testing Airtable Linked Record Filters\n')
  console.log('='.repeat(80))
  
  try {
    // First, get a user to test with
    console.log('📊 Fetching a user with listings...\n')
    
    const users = await base('Users').select({
      maxRecords: 10
    }).firstPage()
    
    // Find a user that has listings
    let testUserId: string | null = null
    let testUserEmail: string | null = null
    
    for (const user of users) {
      const userId = user.id
      const email = user.get('email') as string
      
      // Check if this user has any listings
      const checkFormula = `{Seller} = "${userId}"`
      console.log(`🔍 Checking user ${email} (${userId}) for listings...`)
      console.log(`   Formula: ${checkFormula}`)
      
      const listings = await base('Listings').select({
        filterByFormula: checkFormula,
        maxRecords: 1
      }).firstPage()
      
      if (listings.length > 0) {
        testUserId = userId
        testUserEmail = email
        console.log(`   ✅ Found ${listings.length} listing(s)\n`)
        break
      } else {
        console.log(`   ❌ No listings found\n`)
      }
    }
    
    if (!testUserId || !testUserEmail) {
      console.log('❌ No users with listings found. Creating test data...\n')
      
      // Create a test user
      const newUser = await base('Users').create({
        clerkId: `test_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        username: `testuser_${Date.now()}`,
        rating: 5.0,
        isVerified: false,
        totalSales: 0
      })
      
      testUserId = newUser.id
      testUserEmail = newUser.get('email') as string
      
      console.log(`✅ Created test user: ${testUserEmail} (${testUserId})\n`)
      
      // Create a test listing
      const newListing = await base('Listings').create({
        'title': 'Test Concert Ticket',
        'eventName': 'Test Concert',
        'eventDate': '2024-12-31',
        'price': 5000,
        'quantity': 2,
        'status': 'ACTIVE',
        'seller': [testUserId],
        'description': 'Test listing for filter debugging'
      })
      
      console.log(`✅ Created test listing: ${newListing.get('title')} (${newListing.id})\n`)
    }
    
    // Now test various filter approaches
    console.log('='.repeat(80))
    console.log(`\n🧪 Testing filters for user: ${testUserEmail} (${testUserId})\n`)
    console.log('='.repeat(80))
    
    // First, let's see what the raw data looks like
    console.log('\n📋 Raw listing data check:')
    const rawListings = await base('Listings').select({
      maxRecords: 5
    }).firstPage()
    
    for (const listing of rawListings) {
      const seller = listing.get('seller')
      console.log(`\nListing: ${listing.get('title')} (${listing.id})`)
      console.log(`Seller field type: ${typeof seller}`)
      console.log(`Seller field value: ${JSON.stringify(seller)}`)
      console.log(`Is array: ${Array.isArray(seller)}`)
      if (Array.isArray(seller) && seller.includes(testUserId)) {
        console.log(`✅ This listing belongs to our test user!`)
      }
    }
    
    // Define filter tests
    const filterTests: FilterTest[] = [
      {
        name: 'Direct Record ID Comparison',
        formula: `{seller} = "${testUserId}"`,
        description: 'Direct comparison with record ID'
      },
      {
        name: 'FIND with ARRAYJOIN',
        formula: `FIND("${testUserId}", ARRAYJOIN({seller})) > 0`,
        description: 'Using FIND to search in joined array'
      },
      {
        name: 'SEARCH with ARRAYJOIN',
        formula: `SEARCH("${testUserId}", ARRAYJOIN({seller})) >= 1`,
        description: 'Using SEARCH to find in joined array'
      },
      {
        name: 'FIND with comma separator',
        formula: `FIND("${testUserId}", ARRAYJOIN({seller}, ",")) > 0`,
        description: 'Explicitly using comma separator in ARRAYJOIN'
      },
      {
        name: 'Record ID in array syntax',
        formula: `{seller} = ARRAY("${testUserId}")`,
        description: 'Comparing with ARRAY function'
      },
      {
        name: 'Filter by email (primary field)',
        formula: `{seller} = "${testUserEmail}"`,
        description: 'Using email instead of record ID'
      },
      {
        name: 'FIND email in seller',
        formula: `FIND("${testUserEmail}", ARRAYJOIN({seller})) > 0`,
        description: 'Finding email in joined seller field'
      },
      {
        name: 'No quotes on field name',
        formula: `FIND("${testUserId}", ARRAYJOIN(seller)) > 0`,
        description: 'Testing without curly braces on field name'
      },
      {
        name: 'Single quotes instead of double',
        formula: `FIND('${testUserId}', ARRAYJOIN({seller})) > 0`,
        description: 'Using single quotes for the search value'
      },
      {
        name: 'NOT and FIND combination',
        formula: `NOT(FIND("${testUserId}", ARRAYJOIN({seller})) = 0)`,
        description: 'Using NOT with FIND equals zero'
      },
      {
        name: 'LEN and SUBSTITUTE check',
        formula: `LEN(ARRAYJOIN({seller})) != LEN(SUBSTITUTE(ARRAYJOIN({seller}), "${testUserId}", ""))`,
        description: 'Checking if length changes when substituting user ID'
      },
      {
        name: 'REGEX_MATCH approach',
        formula: `REGEX_MATCH(ARRAYJOIN({seller}), "${testUserId}")`,
        description: 'Using regex to match the user ID'
      }
    ]
    
    // Test each filter
    console.log('\n' + '='.repeat(80))
    console.log('\n🧪 Filter Test Results:\n')
    console.log('='.repeat(80))
    
    for (const test of filterTests) {
      console.log(`\n📌 Test: ${test.name}`)
      console.log(`   Description: ${test.description}`)
      console.log(`   Formula: ${test.formula}`)
      
      try {
        const startTime = Date.now()
        
        const results = await base('Listings').select({
          filterByFormula: test.formula,
          maxRecords: 100,
          fields: ['title', 'eventName', 'seller', 'status']
        }).firstPage()
        
        const duration = Date.now() - startTime
        
        console.log(`   Result: ${results.length} listings found`)
        console.log(`   Duration: ${duration}ms`)
        
        if (results.length > 0) {
          console.log(`   ✅ SUCCESS - Filter returned results`)
          console.log(`   Sample listings:`)
          results.slice(0, 3).forEach(listing => {
            const seller = listing.get('seller')
            console.log(`     - ${listing.get('title')} (Seller: ${JSON.stringify(seller)})`)
          })
        } else {
          console.log(`   ❌ FAILED - No results returned`)
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    
    // Additional debugging - check field configuration
    console.log('\n' + '='.repeat(80))
    console.log('\n🔧 Field Configuration Check:\n')
    console.log('='.repeat(80))
    
    try {
      // Get field metadata if possible
      const listingsSample = await base('Listings').select({
        maxRecords: 1
      }).firstPage()
      
      if (listingsSample.length > 0) {
        const fields = Object.keys(listingsSample[0].fields)
        console.log('\nAvailable fields in Listings table:')
        fields.forEach(field => {
          console.log(`  - ${field}`)
        })
      }
    } catch (error) {
      console.log(`Could not fetch field metadata: ${error}`)
    }
    
    // Test creating a listing and immediately filtering for it
    console.log('\n' + '='.repeat(80))
    console.log('\n🔄 Testing Create + Filter Flow:\n')
    console.log('='.repeat(80))
    
    try {
      // Create a new listing
      const timestamp = Date.now()
      const newListing = await base('Listings').create({
        'title': `Filter Test ${timestamp}`,
        'eventName': 'Filter Test Event',
        'eventDate': '2024-12-31',
        'price': 1000,
        'quantity': 1,
        'status': 'ACTIVE',
        'seller': [testUserId],
        'description': 'Created for filter testing'
      })
      
      console.log(`✅ Created listing: ${newListing.get('title')} (${newListing.id})`)
      console.log(`   Seller field: ${JSON.stringify(newListing.get('seller'))}`)
      
      // Wait a moment for Airtable to index
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Try to find it with different filters
      const testFilters = [
        `{title} = "Filter Test ${timestamp}"`,
        `{seller} = "${testUserId}"`,
        `FIND("${testUserId}", ARRAYJOIN({seller})) > 0`
      ]
      
      for (const filter of testFilters) {
        console.log(`\n   Testing filter: ${filter}`)
        const found = await base('Listings').select({
          filterByFormula: filter,
          maxRecords: 10
        }).firstPage()
        
        console.log(`   Result: ${found.length} listing(s) found`)
        if (found.length > 0 && found.some(l => l.id === newListing.id)) {
          console.log(`   ✅ Successfully found the newly created listing`)
        }
      }
      
      // Clean up
      await base('Listings').destroy(newListing.id)
      console.log(`\n🧹 Cleaned up test listing`)
      
    } catch (error) {
      console.log(`❌ Create + Filter test failed: ${error}`)
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('\n✅ Filter testing complete!\n')
    
    // Summary and recommendations
    console.log('📊 Summary and Recommendations:\n')
    console.log('Based on the test results above, identify which filter syntax works')
    console.log('for your Airtable base configuration. Common working patterns include:')
    console.log('1. Direct comparison: {Seller} = "recordId"')
    console.log('2. FIND with ARRAYJOIN: FIND("recordId", ARRAYJOIN({Seller})) > 0')
    console.log('3. Email-based filtering if Seller is configured as a linked record')
    console.log('\nCheck the Airtable UI to verify the field type and configuration.')
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the tests
console.log('🚀 Starting Airtable Filter Testing...')
testAirtableFilters()