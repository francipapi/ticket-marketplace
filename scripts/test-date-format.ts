#!/usr/bin/env npx tsx

// Test date format transformation for Airtable

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { getAirtableClient } from '../lib/airtable-client'

async function testDateFormat() {
  console.log('🧪 Testing date format transformation...')
  
  try {
    const client = getAirtableClient()
    
    // Test the date transformation
    const testData = {
      title: 'Test Event',
      eventName: 'Test Event',
      eventDate: new Date('2025-07-12T22:41:00.000Z'), // This was the failing date
      priceInCents: 4500,
      quantity: 1,
      seller: ['rec4okTshcrscMSuO']
    }
    
    console.log('📅 Original date:', testData.eventDate)
    console.log('📅 Original ISO string:', testData.eventDate.toISOString())
    
    // Transform the data
    const transformedData = client.transformToAirtableFields('listings', testData)
    
    console.log('\n✅ Transformed data:')
    console.log(transformedData)
    
    console.log('\n📊 Date field analysis:')
    console.log(`eventDate field: ${transformedData.eventDate}`)
    console.log(`Expected format: YYYY-MM-DD (date only)`)
    console.log(`Actual format: ${typeof transformedData.eventDate} - ${transformedData.eventDate}`)
    
    if (transformedData.eventDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log('✅ Date format is correct for Airtable!')
    } else {
      console.log('❌ Date format might still be incorrect')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testDateFormat().then(() => {
  console.log('\n✅ Date format test completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})