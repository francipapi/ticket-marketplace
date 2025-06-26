import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcryptjs'; // No longer needed with Supabase Auth

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding the database...');

  // Create test users
  const hashedPassword = 'placeholder'; // No longer needed with Supabase Auth
  
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      username: 'alice',
      passwordHash: hashedPassword,
    },
  });
  
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      username: 'bob',
      passwordHash: hashedPassword,
    },
  });

  // Create test listings
  const eventDate = new Date('2024-12-25T20:00:00Z');
  
  const concert = await prisma.listing.upsert({
    where: { id: 'concert-listing' },
    update: {},
    create: {
      id: 'concert-listing',
      userId: alice.id,
      title: 'Taylor Swift Concert - Floor Seats',
      eventName: 'Taylor Swift: The Eras Tour',
      eventDate: eventDate,
      venue: 'Madison Square Garden',
      priceInCents: 25000, // $250.00
      quantity: 2,
      description: 'Amazing floor seats for Taylor Swift concert. Section A, Row 5.',
      status: 'active',
    },
  });

  const festival = await prisma.listing.upsert({
    where: { id: 'festival-listing' },
    update: {},
    create: {
      id: 'festival-listing',
      userId: bob.id,
      title: 'Coachella Weekend 1 - General Admission',
      eventName: 'Coachella Valley Music Festival',
      eventDate: new Date('2024-04-15T12:00:00Z'),
      venue: 'Empire Polo Club',
      priceInCents: 40000, // $400.00
      quantity: 1,
      description: 'General admission pass for Coachella Weekend 1.',
      status: 'active',
    },
  });

  // Create test offers
  await prisma.offer.upsert({
    where: { id: 'offer-1' },
    update: {},
    create: {
      id: 'offer-1',
      listingId: concert.id,
      buyerId: bob.id,
      offerPriceInCents: 25000, // Asking price
      quantity: 2,
      messageTemplate: 'asking_price',
      status: 'pending',
    },
  });

  await prisma.offer.upsert({
    where: { id: 'offer-2' },
    update: {},
    create: {
      id: 'offer-2',
      listingId: festival.id,
      buyerId: alice.id,
      offerPriceInCents: 35000, // Counter offer
      quantity: 1,
      messageTemplate: 'make_offer',
      customMessage: 'Would you accept $350?',
      status: 'pending',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`📧 Test users: alice@example.com, bob@example.com (password: password123)`);
  console.log(`🎫 Created ${await prisma.listing.count()} listings`);
  console.log(`💬 Created ${await prisma.offer.count()} offers`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });