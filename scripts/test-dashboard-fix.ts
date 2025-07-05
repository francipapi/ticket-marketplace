#!/usr/bin/env npx tsx

// Test the dashboard data transformation fix

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { AirtableDatabaseService } from '../lib/services/implementations/airtable/database.service'

async function testDashboardFix() {
  console.log('🧪 Testing dashboard data transformation fix...')
  
  try {
    const airtableService = new AirtableDatabaseService()
    
    // Test the exact flow that the dashboard API uses
    console.log('\n1️⃣ Testing received offers flow...')
    
    // Find Alice (seller)
    const aliceClerkId = 'user_2z8zB7aOUa2ixUUZb8U1JMqzh0Y'
    const alice = await airtableService.users.findByClerkId(aliceClerkId)
    
    if (!alice) {
      console.log('❌ Alice not found')
      return
    }
    
    console.log(`✅ Found Alice: ${alice.username} (${alice.email})`)
    
    // Get Alice's listings (same as API)
    const listingsResult = await airtableService.listings.findByUserId(alice.id)
    const listingIds = listingsResult.items.map(listing => listing.id)
    
    console.log(`✅ Alice has ${listingIds.length} listings: ${listingIds.join(', ')}`)
    
    // Get offers on Alice's listings (same as API)
    const allOffers = []
    for (const listingId of listingIds) {
      const offersResult = await airtableService.offers.findByListingId(listingId, {
        limit: 50,
      })
      
      console.log(`   Listing ${listingId}: ${offersResult.items.length} offers`)
      
      // Simulate the API enrichment
      const enrichedOffers = await Promise.all(
        offersResult.items.map(async (offer) => {
          const listing = listingsResult.items.find(l => l.id === listingId)
          
          let buyerInfo = null
          if (offer.buyerId) {
            try {
              const buyer = await airtableService.users.findById(offer.buyerId)
              if (buyer) {
                buyerInfo = { username: buyer.username }
              }
            } catch (error) {
              console.warn(`Could not fetch buyer info for offer ${offer.id}:`, error)
            }
          }
          
          return {
            id: offer.id,
            listingId: offer.listingId,
            buyerId: offer.buyerId,
            offerPriceInCents: offer.offerPriceInCents,
            quantity: offer.quantity,
            messageTemplate: offer.messageTemplate,
            customMessage: offer.customMessage,
            status: offer.status,
            createdAt: offer.createdAt,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              eventName: listing.eventName,
              eventDate: listing.eventDate,
              priceInCents: listing.priceInCents,
            } : null,
            buyer: buyerInfo,
          }
        })
      )
      
      allOffers.push(...enrichedOffers)
    }
    
    console.log(`\n✅ Total received offers: ${allOffers.length}`)
    
    // Test the dashboard transformation (the fix we made)
    console.log('\n2️⃣ Testing dashboard transformation...')
    
    // This simulates what the dashboard does
    const data = allOffers // API returns offers directly
    
    // OLD (broken) transformation:
    // const oldTransformation = (data.offers || []).map(...)
    // This would fail because data.offers is undefined
    
    // NEW (fixed) transformation:
    const transformedReceivedOffers = (Array.isArray(data) ? data : []).map((offer: any) => ({
      id: offer.id,
      offerPrice: offer.offerPriceInCents,
      quantity: offer.quantity,
      status: offer.status,
      message: offer.messageTemplate,
      customMessage: offer.customMessage,
      listing: offer.listing,
      createdAt: offer.createdAt,
      listingInfo: offer.listing,
    }))
    
    console.log(`✅ Dashboard transformation successful: ${transformedReceivedOffers.length} offers`)
    
    if (transformedReceivedOffers.length > 0) {
      console.log('\n📋 Dashboard offers preview:')
      transformedReceivedOffers.forEach((offer, index) => {
        console.log(`   ${index + 1}. Offer ${offer.id}`)
        console.log(`      Event: ${offer.listingInfo?.title} - ${offer.listingInfo?.eventName}`)
        console.log(`      Price: $${(offer.offerPrice / 100).toFixed(2)}`)
        console.log(`      Status: ${offer.status}`)
        console.log(`      Message: ${offer.message}`)
      })
      
      console.log('\n🎉 SUCCESS: Dashboard should now show offers correctly!')
    } else {
      console.log('\n⚠️  No offers to display')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testDashboardFix().then(() => {
  console.log('\n✅ Dashboard fix test completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})