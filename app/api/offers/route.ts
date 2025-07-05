import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/factory';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';
import { z } from 'zod';

// Validation schema for creating offers
const createOfferSchema = z.object({
  listingId: z.string().min(1),
  offerPriceInCents: z.number().int().positive(),
  quantity: z.number().int().positive(),
  messageTemplate: z.enum(['asking_price', 'make_offer', 'check_availability']),
  customMessage: z.string().optional(),
});

// GET /api/offers - Get user's offers (sent and received)
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sent' or 'received'
    
    const dbService = getDatabaseService();

    if (type === 'sent') {
      // Get offers sent by the user
      const offersResult = await dbService.offers.findMany({
        buyerId: user.id,
        limit: 100,
      });

      // Enrich with listing information
      const offers = await Promise.all(
        offersResult.items.map(async (offer) => {
          let listingInfo = null;
          if (offer.listingId) {
            try {
              const listing = await dbService.listings.findById(offer.listingId);
              if (listing) {
                // Get seller info
                let sellerInfo = null;
                if (listing.userId) {
                  const seller = await dbService.users.findById(listing.userId);
                  if (seller) {
                    sellerInfo = { username: seller.username };
                  }
                }

                listingInfo = {
                  id: listing.id,
                  title: listing.title,
                  eventName: listing.eventName,
                  eventDate: listing.eventDate,
                  priceInCents: listing.priceInCents,
                  user: sellerInfo,
                };
              }
            } catch (error) {
              console.warn(`Could not fetch listing info for offer ${offer.id}:`, error);
            }
          }

          return {
            ...offer,
            listing: listingInfo,
          };
        })
      );

      return NextResponse.json(offers);

    } else if (type === 'received') {
      // Get user's listings first
      const listingsResult = await dbService.listings.findByUserId(user.id);
      const listingIds = listingsResult.items.map(listing => listing.id);

      if (listingIds.length === 0) {
        return NextResponse.json([]);
      }

      // Get offers on user's listings
      const allOffers = [];
      for (const listingId of listingIds) {
        const offersResult = await dbService.offers.findByListingId(listingId, {
          limit: 50,
        });
        
        // Enrich offers with listing and buyer info
        const enrichedOffers = await Promise.all(
          offersResult.items.map(async (offer) => {
            const listing = listingsResult.items.find(l => l.id === listingId);
            
            let buyerInfo = null;
            if (offer.buyerId) {
              try {
                const buyer = await dbService.users.findById(offer.buyerId);
                if (buyer) {
                  buyerInfo = { username: buyer.username };
                }
              } catch (error) {
                console.warn(`Could not fetch buyer info for offer ${offer.id}:`, error);
              }
            }

            return {
              ...offer,
              listing: listing ? {
                id: listing.id,
                title: listing.title,
                eventName: listing.eventName,
                eventDate: listing.eventDate,
                priceInCents: listing.priceInCents,
              } : null,
              buyer: buyerInfo,
            };
          })
        );

        allOffers.push(...enrichedOffers);
      }

      // Sort by creation date (newest first)
      allOffers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json(allOffers);

    } else {
      // Get both sent and received offers
      const [sentOffersResult, listingsResult] = await Promise.all([
        dbService.offers.findMany({ buyerId: user.id, limit: 100 }),
        dbService.listings.findByUserId(user.id),
      ]);

      // Process sent offers
      const sentOffers = await Promise.all(
        sentOffersResult.items.map(async (offer) => {
          let listingInfo = null;
          if (offer.listingId) {
            try {
              const listing = await dbService.listings.findById(offer.listingId);
              if (listing) {
                // Get seller info
                let sellerInfo = null;
                if (listing.userId) {
                  const seller = await dbService.users.findById(listing.userId);
                  if (seller) {
                    sellerInfo = { username: seller.username };
                  }
                }

                listingInfo = {
                  id: listing.id,
                  title: listing.title,
                  eventName: listing.eventName,
                  eventDate: listing.eventDate,
                  priceInCents: listing.priceInCents,
                  user: sellerInfo,
                };
              }
            } catch (error) {
              console.warn(`Could not fetch listing info for offer ${offer.id}:`, error);
            }
          }

          return {
            ...offer,
            listing: listingInfo,
          };
        })
      );

      // Process received offers
      const listingIds = listingsResult.items.map(listing => listing.id);
      const receivedOffers = [];
      
      for (const listingId of listingIds) {
        const offersResult = await dbService.offers.findByListingId(listingId, {
          limit: 50,
        });
        
        const enrichedOffers = await Promise.all(
          offersResult.items.map(async (offer) => {
            const listing = listingsResult.items.find(l => l.id === listingId);
            
            let buyerInfo = null;
            if (offer.buyerId) {
              try {
                const buyer = await dbService.users.findById(offer.buyerId);
                if (buyer) {
                  buyerInfo = { username: buyer.username };
                }
              } catch (error) {
                console.warn(`Could not fetch buyer info for offer ${offer.id}:`, error);
              }
            }

            return {
              ...offer,
              listing: listing ? {
                id: listing.id,
                title: listing.title,
                eventName: listing.eventName,
                eventDate: listing.eventDate,
                priceInCents: listing.priceInCents,
              } : null,
              buyer: buyerInfo,
            };
          })
        );

        receivedOffers.push(...enrichedOffers);
      }

      return NextResponse.json({
        sent: sentOffers,
        received: receivedOffers,
      });
    }
  });
}

// POST /api/offers - Create new offer
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireAuth();
    const body = await request.json();

    // Validate the request body
    const validationResult = createOfferSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const dbService = getDatabaseService();

    // Check if listing exists and is active
    const listing = await dbService.listings.findById(data.listingId);
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (listing.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Listing is no longer active' },
        { status: 400 }
      );
    }

    if (listing.userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot make offer on your own listing' },
        { status: 400 }
      );
    }

    if (data.quantity > listing.quantity) {
      return NextResponse.json(
        { error: 'Requested quantity not available' },
        { status: 400 }
      );
    }

    // Check if user already has a pending offer on this listing
    const existingOffersResult = await dbService.offers.findMany({
      buyerId: user.id,
      listingId: data.listingId,
      status: 'PENDING',
      limit: 1,
    });

    if (existingOffersResult.items.length > 0) {
      return NextResponse.json(
        { error: 'You already have a pending offer on this listing' },
        { status: 400 }
      );
    }

    // Create offer
    const offer = await dbService.offers.create({
      listingId: data.listingId,
      buyerId: user.id,
      offerPriceInCents: data.offerPriceInCents,
      quantity: data.quantity,
      messageTemplate: data.messageTemplate,
      customMessage: data.messageTemplate === 'make_offer' ? data.customMessage : undefined,
      status: 'PENDING',
    });

    // Get seller info
    let sellerInfo = null;
    if (listing.userId) {
      try {
        const seller = await dbService.users.findById(listing.userId);
        if (seller) {
          sellerInfo = { username: seller.username };
        }
      } catch (error) {
        console.warn(`Could not fetch seller info:`, error);
      }
    }

    // Get buyer info
    const buyer = await dbService.users.findById(user.id);

    return NextResponse.json({
      ...offer,
      listing: {
        id: listing.id,
        title: listing.title,
        eventName: listing.eventName,
        eventDate: listing.eventDate,
        priceInCents: listing.priceInCents,
        user: sellerInfo,
      },
      buyer: buyer ? {
        username: buyer.username,
      } : null,
    });
  });
}