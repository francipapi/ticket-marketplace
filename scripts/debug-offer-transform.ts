#!/usr/bin/env npx tsx

// Debug script to see what's happening with offer transformation

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { getAirtableClient, AIRTABLE_TABLES } from '../lib/airtable-client'

async function debugOfferTransform() {
  console.log('🔍 Debugging offer transformation...')
  
  try {
    const client = getAirtableClient()
    
    // Get one offer record
    console.log('\n1️⃣ Getting raw offer record...')
    const offerRecords = await client.executeWithRateLimit(async () => {
      const table = client.getTable(AIRTABLE_TABLES.OFFERS)
      return await table.select({ maxRecords: 1 }).all()
    })
    
    if (offerRecords.length === 0) {
      console.log('❌ No offers found')
      return
    }
    
    const offer = offerRecords[0]
    console.log('Raw offer record:')
    console.log(`  ID: ${offer.id}`)
    console.log(`  Fields:`, offer.fields)
    
    // Test transformation
    console.log('\n2️⃣ Testing transformation...')
    const transformed = client.transformFromAirtableFields('offers', offer)
    console.log('Transformed offer:')
    console.log(transformed)
    
    // Test individual fields
    console.log('\n3️⃣ Testing individual field access...')
    console.log(`  offer.get('listing'): ${JSON.stringify(offer.get('listing'))}`)
    console.log(`  offer.get('buyer'): ${JSON.stringify(offer.get('buyer'))}`)
    console.log(`  offer.get('offerPrice'): ${offer.get('offerPrice')}`)
    console.log(`  offer.get('status'): ${offer.get('status')}`)
    console.log(`  offer.get('message'): ${offer.get('message')}`)
    
    // Manual transformation check
    console.log('\n4️⃣ Manual transformation check...')
    const listingValue = offer.get('listing')
    const buyerValue = offer.get('buyer')
    
    console.log(`  Listing array: ${JSON.stringify(listingValue)}`)
    console.log(`  Listing first: ${Array.isArray(listingValue) ? listingValue[0] : 'not array'}`)
    console.log(`  Buyer array: ${JSON.stringify(buyerValue)}`)
    console.log(`  Buyer first: ${Array.isArray(buyerValue) ? buyerValue[0] : 'not array'}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the debug
debugOfferTransform().then(() => {
  console.log('\n✅ Debug completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Debug failed:', error)
  process.exit(1)
})