#!/usr/bin/env npx tsx

// Test the actual API response for offers

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

async function testApiOffers() {
  console.log('🧪 Testing /api/offers endpoints...')
  
  try {
    const baseUrl = 'http://localhost:3001'
    
    // Test received offers endpoint
    console.log('\n1️⃣ Testing /api/offers?type=received...')
    const receivedResponse = await fetch(`${baseUrl}/api/offers?type=received`, {
      headers: {
        // We need to simulate being Alice
        'Cookie': 'session=alice-session' // This won't work, but let's see the error
      }
    })
    
    console.log(`Response status: ${receivedResponse.status}`)
    
    if (receivedResponse.ok) {
      const receivedData = await receivedResponse.json()
      console.log(`✅ Received offers count: ${receivedData.length}`)
      
      if (receivedData.length > 0) {
        console.log('\n📋 Received offers:')
        receivedData.forEach((offer: any, index: number) => {
          console.log(`   ${index + 1}. Offer ${offer.id}`)
          console.log(`      Listing: ${JSON.stringify(offer.listing)}`)
          console.log(`      Buyer: ${JSON.stringify(offer.buyer)}`)
          console.log(`      Price: $${(offer.offerPriceInCents / 100).toFixed(2)}`)
          console.log(`      Status: ${offer.status}`)
          console.log(`      Message: ${offer.messageTemplate}`)
        })
      } else {
        console.log('⚠️  No received offers returned')
      }
    } else {
      const errorText = await receivedResponse.text()
      console.log(`❌ Error response: ${errorText}`)
    }
    
    // Test sent offers endpoint
    console.log('\n2️⃣ Testing /api/offers?type=sent...')
    const sentResponse = await fetch(`${baseUrl}/api/offers?type=sent`)
    
    console.log(`Response status: ${sentResponse.status}`)
    
    if (sentResponse.ok) {
      const sentData = await sentResponse.json()
      console.log(`✅ Sent offers count: ${sentData.length}`)
      
      if (sentData.length > 0) {
        console.log('\n📋 Sent offers:')
        sentData.forEach((offer: any, index: number) => {
          console.log(`   ${index + 1}. Offer ${offer.id}`)
          console.log(`      Listing: ${JSON.stringify(offer.listing)}`)
          console.log(`      Price: $${(offer.offerPriceInCents / 100).toFixed(2)}`)
          console.log(`      Status: ${offer.status}`)
        })
      } else {
        console.log('⚠️  No sent offers returned')
      }
    } else {
      const errorText = await sentResponse.text()
      console.log(`❌ Error response: ${errorText}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the test
testApiOffers().then(() => {
  console.log('\n✅ API test completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ API test failed:', error)
  process.exit(1)
})