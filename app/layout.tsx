import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { QueryProvider } from "@/lib/providers/query-client";
import { ToastProvider } from "@/lib/providers/toast-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Warwick Tickets - Student Ticket Marketplace",
  description: "The trusted marketplace for Warwick University students to buy and sell event tickets safely. No more sketchy Facebook groups!",
  keywords: "Warwick University, tickets, student marketplace, events, concerts, festivals",
  authors: [{ name: "Warwick Tickets Team" }],
  openGraph: {
    title: "Warwick Tickets - Student Ticket Marketplace",
    description: "Buy and sell tickets safely within the Warwick University community",
    type: "website",
    locale: "en_GB"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <QueryProvider>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main>{children}</main>
            </div>
            <ToastProvider />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
