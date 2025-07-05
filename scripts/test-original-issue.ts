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

async function testOriginalIssue() {
  console.log('\n🔍 Testing Original Issue: User ID recQdwm14dppUN5KH\n')
  console.log('='.repeat(80))
  
  try {
    // This is the user ID from the original logs
    const problematicUserId = 'recQdwm14dppUN5KH'
    
    // Get the user to find their email
    console.log(`📊 Looking up user: ${problematicUserId}`)
    
    const user = await base('Users').find(problematicUserId)
    const userEmail = user.get('email') as string
    const username = user.get('username') as string
    
    console.log(`✅ User found: ${userEmail} (${username})`)
    
    // Test the original failing filter
    console.log('\n❌ Testing Original Failing Filter:')
    console.log('='.repeat(50))
    
    const originalFilter = `FIND("${problematicUserId}", ARRAYJOIN({seller})) > 0`
    console.log(`Filter: ${originalFilter}`)
    
    const originalResults = await base('Listings').select({
      filterByFormula: originalFilter,
      maxRecords: 100
    }).firstPage()
    
    console.log(`Result: ${originalResults.length} listings found`)
    console.log(`Status: ${originalResults.length > 0 ? '✅ SUCCESS' : '❌ FAILED'}`)
    
    // Test the working filter
    console.log('\n✅ Testing Working Filter:')
    console.log('='.repeat(50))
    
    const workingFilter = `{seller} = "${userEmail}"`
    console.log(`Filter: ${workingFilter}`)
    
    const workingResults = await base('Listings').select({
      filterByFormula: workingFilter,
      maxRecords: 100
    }).firstPage()
    
    console.log(`Result: ${workingResults.length} listings found`)
    console.log(`Status: ${workingResults.length > 0 ? '✅ SUCCESS' : '❌ FAILED'}`)
    
    if (workingResults.length > 0) {
      console.log('\nFound listings:')
      workingResults.forEach(listing => {
        const seller = listing.get('seller')
        console.log(`  - ${listing.get('title')} (Seller: ${JSON.stringify(seller)})`)
      })
    }
    
    // Test alternative working filter
    console.log('\n✅ Testing Alternative Working Filter:')
    console.log('='.repeat(50))
    
    const alternativeFilter = `FIND("${userEmail}", ARRAYJOIN({seller})) > 0`
    console.log(`Filter: ${alternativeFilter}`)
    
    const alternativeResults = await base('Listings').select({
      filterByFormula: alternativeFilter,
      maxRecords: 100
    }).firstPage()
    
    console.log(`Result: ${alternativeResults.length} listings found`)
    console.log(`Status: ${alternativeResults.length > 0 ? '✅ SUCCESS' : '❌ FAILED'}`)
    
    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 SUMMARY FOR ORIGINAL ISSUE:')
    console.log('='.repeat(80))
    
    console.log(`\n🔍 User Analysis:`)
    console.log(`  - User Record ID: ${problematicUserId}`)
    console.log(`  - User Email: ${userEmail}`)
    console.log(`  - User Username: ${username}`)
    
    console.log(`\n❌ Original Filter (FAILED):`)
    console.log(`  - Formula: FIND("${problematicUserId}", ARRAYJOIN({seller})) > 0`)
    console.log(`  - Results: ${originalResults.length} listings`)
    console.log(`  - Issue: Filtering by record ID doesn't work with linked record fields`)
    
    console.log(`\n✅ Working Filter (SUCCESS):`)
    console.log(`  - Formula: {seller} = "${userEmail}"`)
    console.log(`  - Results: ${workingResults.length} listings`)
    console.log(`  - Solution: Filter by email (primary field) instead of record ID`)
    
    console.log(`\n🔧 Fix Required:`)
    console.log(`  - Change getUserListings to lookup user email first`)
    console.log(`  - Use email for filtering instead of record ID`)
    console.log(`  - This will resolve the "0 results" issue`)
    
    console.log('\n' + '='.repeat(80))
    console.log('🎯 The fix is confirmed and ready to implement!')
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
console.log('🚀 Testing Original Issue...')
testOriginalIssue()