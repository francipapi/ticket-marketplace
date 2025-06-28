import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/services/database.service';

export async function GET() {
  try {
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return NextResponse.json({ 
        error: 'Not authenticated - no Clerk user found'
      }, { status: 401 });
    }

    const userId = clerkUser.id;

    // Check if user exists in Airtable
    let airtableUser = await db.getUserByClerkId(userId);
    
    if (!airtableUser) {
      // Create the user
      const email = clerkUser.emailAddresses[0]?.emailAddress || 'no-email@example.com';
      const username = clerkUser.username || clerkUser.firstName || email.split('@')[0] || 'user';
      
      try {
        airtableUser = await db.createUser({
          email,
          username,
          clerkId: userId,
        });
        
        return NextResponse.json({
          message: 'User created in Airtable',
          user: airtableUser,
          clerkUser: {
            id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            username: clerkUser.username,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
          }
        });
      } catch (createError: any) {
        return NextResponse.json({
          error: 'Failed to create user in Airtable',
          details: createError.message,
          clerkUser: {
            id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            username: clerkUser.username,
          }
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      message: 'User already exists in Airtable',
      user: airtableUser,
      clerkUser: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        username: clerkUser.username,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Server error',
      details: error.message 
    }, { status: 500 });
  }
}