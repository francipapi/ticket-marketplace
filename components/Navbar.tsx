'use client';

import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Plus, Search, Menu, X, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="bg-gradient-to-r from-purple-700 to-gold-500 p-2 rounded-lg group-hover:shadow-lg transition-shadow duration-200">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-xl text-purple-700">Warwick</span>
                <span className="font-bold text-xl text-gold-600">Tickets</span>
              </div>
              <div className="sm:hidden">
                <span className="font-bold text-lg text-purple-700">WT</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/browse"
              className="text-gray-700 hover:text-purple-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Browse
            </Link>
            <Link
              href="/events"
              className="text-gray-700 hover:text-purple-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Events
            </Link>
            
            <SignedIn>
              <Link
                href="/listings/create-ocr"
                className="flex items-center space-x-1 bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Sell</span>
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-purple-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'h-10 w-10',
                    userButtonPopoverCard: 'shadow-lg border border-purple-200',
                    userButtonPopoverActionButton: 'hover:bg-purple-50'
                  },
                }}
              />
            </SignedIn>
            
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </SignInButton>
              <Link href="/sign-up">
                <Button variant="gradient" size="sm">
                  Join Warwick
                </Button>
              </Link>
            </SignedOut>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <SignedIn>
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'h-8 w-8',
                  },
                }}
              />
            </SignedIn>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-purple-700 p-2"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/browse"
              className="block text-gray-700 hover:text-purple-700 py-2 text-base font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Tickets
            </Link>
            <Link
              href="/events"
              className="block text-gray-700 hover:text-purple-700 py-2 text-base font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Events
            </Link>
            
            <SignedIn>
              <Link
                href="/listings/create-ocr"
                className="flex items-center space-x-2 bg-purple-700 text-white px-4 py-3 rounded-md text-base font-medium hover:bg-purple-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus className="h-5 w-5" />
                <span>Sell Tickets</span>
              </Link>
              <Link
                href="/dashboard"
                className="block text-gray-700 hover:text-purple-700 py-2 text-base font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            </SignedIn>
            
            <SignedOut>
              <div className="space-y-2 pt-2">
                <SignInButton mode="modal">
                  <Button variant="outline" className="w-full justify-center">
                    Login
                  </Button>
                </SignInButton>
                <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="gradient" className="w-full justify-center">
                    Join Warwick Tickets
                  </Button>
                </Link>
              </div>
            </SignedOut>
          </div>
        </div>
      )}
    </nav>
  );
}