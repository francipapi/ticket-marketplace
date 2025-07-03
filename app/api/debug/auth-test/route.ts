import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Test different auth methods
    const authResult = auth();
    const user = await currentUser();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authResult: {
        userId: authResult.userId,
        sessionId: authResult.sessionId,
        hasAuth: !!authResult.userId,
      },
      currentUser: user ? {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        username: user.username,
      } : null,
      headers: {
        cookie: request.headers.get('cookie'),
        authorization: request.headers.get('authorization'),
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}