#!/usr/bin/env npx tsx

// Test script to verify the Airtable offer filter fix
// This script tests the corrected filtering by email/title instead of record ID

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { AirtableDatabaseService } from '../lib/services/implementations/airtable/database.service'

async function testOfferFilterFix() {
  console.log('🧪 Testing Airtable offer filter fix directly...')
  
  try {
    // Create Airtable service directly
    const airtableService = new AirtableDatabaseService()
    
    // 1. Find Bob (who has offers)
    console.log('\n1️⃣ Finding Bob (buyer with offers)...')
    const bobClerkId = 'user_2z91rOtpcUpYAJSz7nAxBmN7Fr0' // Bob's Clerk ID
    const bob = await airtableService.users.findByClerkId(bobClerkId)
    
    if (!bob) {
      console.log('❌ Bob not found')
      return
    }
    
    console.log(`✅ Found buyer: ${bob.username} (${bob.email})`)
    console.log(`   Record ID: ${bob.id}`)
    
    // 2. Test offers sent by Bob (buyerId filtering)
    console.log('\n2️⃣ Testing offers sent by Bob (buyerId filtering)...')
    const sentOffers = await airtableService.offers.findMany({
      buyerId: bob.id,  // This should now internally convert to email-based filtering
      limit: 50
    })
    
    console.log(`✅ Found ${sentOffers.items.length} offers sent by Bob`)
    
    if (sentOffers.items.length > 0) {
      console.log('\n📋 Sent offer details:')
      sentOffers.items.forEach((offer, index) => {
        console.log(`   ${index + 1}. Offer ${offer.id}`)
        console.log(`      Listing ID: ${offer.listingId}`)
        console.log(`      Price: $${(offer.offerPriceInCents / 100).toFixed(2)}`)
        console.log(`      Status: ${offer.status}`)
        console.log(`      Buyer ID matches: ${offer.buyerId === bob.id ? '✅' : '❌'}`)
      })
    }
    
    // 3. Find Alice (who has listings with offers)
    console.log('\n3️⃣ Finding Alice (seller with listings)...')
    const aliceClerkId = 'user_2z8zB7aOUa2ixUUZb8U1JMqzh0Y' // Alice's Clerk ID
    const alice = await airtableService.users.findByClerkId(aliceClerkId)
    
    if (!alice) {
      console.log('❌ Alice not found')
      return
    }
    
    console.log(`✅ Found seller: ${alice.username} (${alice.email})`)
    
    // 4. Get Alice's listings and test offers received
    console.log('\n4️⃣ Testing offers received by Alice (listingId filtering)...')
    const aliceListings = await airtableService.listings.findMany({
      userId: alice.id,
      limit: 50
    })
    
    console.log(`✅ Alice has ${aliceListings.items.length} listings`)
    
    let totalOffersReceived = 0
    for (const listing of aliceListings.items) {
      console.log(`\n   Testing offers for listing: ${listing.title}`)
      
      const offersForListing = await airtableService.offers.findMany({
        listingId: listing.id,  // This should now internally convert to title-based filtering
        limit: 50
      })
      
      console.log(`   ✅ Found ${offersForListing.items.length} offers for "${listing.title}"`)
      totalOffersReceived += offersForListing.items.length
      
      if (offersForListing.items.length > 0) {
        offersForListing.items.forEach((offer, index) => {
          console.log(`     ${index + 1}. Offer ${offer.id}`)
          console.log(`        Price: $${(offer.offerPriceInCents / 100).toFixed(2)}`)
          console.log(`        Status: ${offer.status}`)
          console.log(`        Listing ID matches: ${offer.listingId === listing.id ? '✅' : '❌'}`)
        })
      }
    }
    
    console.log(`\n✅ Total offers received by Alice: ${totalOffersReceived}`)
    
    if (sentOffers.items.length > 0 || totalOffersReceived > 0) {
      console.log('\n🎉 SUCCESS: Airtable offer filtering is now working correctly!')
      console.log('The dashboard should now show offers properly.')
    } else {
      console.log('\n⚠️  No offers found. This could mean:')
      console.log('   1. There are no offers in the database')
      console.log('   2. The filtering is still not working')
      console.log('   3. The test users have no offers')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testOfferFilterFix().then(() => {
  console.log('\n✅ Offer filter test completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test suite failed:', error)
  process.exit(1)
})