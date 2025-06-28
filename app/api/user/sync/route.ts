import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/services/database.service';

export async function GET() {
  try {
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        user: null
      }, { status: 401 });
    }

    // Check if user exists in Airtable
    let airtableUser = await db.getUserByClerkId(clerkUser.id);
    
    if (!airtableUser) {
      // Create the user
      const email = clerkUser.emailAddresses[0]?.emailAddress || 'no-email@example.com';
      let username = clerkUser.username || clerkUser.firstName || email.split('@')[0] || 'user';
      
      // Make username unique if needed by appending a timestamp
      const existingUsername = await db.getUserByEmail(username);
      if (existingUsername) {
        username = `${username}_${Date.now()}`;
      }
      
      try {
        airtableUser = await db.createUser({
          email,
          username,
          clerkId: clerkUser.id,
        });
      } catch (createError: any) {
        console.error('Failed to create user in Airtable:', createError);
        return NextResponse.json({
          error: 'Failed to create user',
          details: createError.message
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      user: {
        id: airtableUser.id,
        email: airtableUser.email,
        username: airtableUser.username,
        clerkId: airtableUser.clerkId,
        rating: airtableUser.rating,
        isVerified: airtableUser.isVerified,
        totalSales: airtableUser.totalSales,
      }
    });
  } catch (error: any) {
    console.error('User sync error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error.message 
    }, { status: 500 });
  }
}