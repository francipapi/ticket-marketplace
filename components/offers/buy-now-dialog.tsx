"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CreditCard, Shield, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useCreateOffer } from '@/lib/hooks/use-offers'
import { toast } from 'sonner'

const buyNowSchema = z.object({
  quantity: z.number().min(1).max(10),
  contactEmail: z.string().email().optional(),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  })
})

type BuyNowFormData = z.infer<typeof buyNowSchema>

interface Listing {
  id: string
  title: string
  eventName: string
  eventDate: string
  priceInCents: number
  quantity: number
  seller: {
    id: string
    username: string
    rating: number
  }
}

interface BuyNowDialogProps {
  listing: Listing
  open: boolean
  onClose: () => void
}

export function BuyNowDialog({ listing, open, onClose }: BuyNowDialogProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details')
  const createOffer = useCreateOffer()
  
  const form = useForm<BuyNowFormData>({
    resolver: zodResolver(buyNowSchema),
    defaultValues: {
      quantity: 1,
      contactEmail: '',
      agreedToTerms: false
    }
  })
  
  const watchedQuantity = form.watch('quantity')
  const totalPrice = (listing.priceInCents * watchedQuantity) / 100
  const platformFee = totalPrice * 0.06 // 6% platform fee
  const totalWithFees = totalPrice + platformFee
  
  const onSubmit = async (data: BuyNowFormData) => {
    try {
      // Create the offer with "asking_price" message type
      await createOffer.mutateAsync({
        listingId: listing.id,
        offerPriceInCents: listing.priceInCents * data.quantity,
        quantity: data.quantity,
        messageTemplate: 'asking_price',
        customMessage: `Buying ${data.quantity} ticket(s) at asking price`
      })
      
      // Move to payment step
      setStep('payment')
      
      // Simulate payment processing after 2 seconds
      setTimeout(() => {
        setStep('success')
        toast.success('Purchase completed successfully!')
      }, 2000)
    } catch (error) {
      toast.error('Failed to create purchase. Please try again.')
    }
  }
  
  const handleClose = () => {
    setStep('details')
    form.reset()
    onClose()
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'details' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                Buy Now
              </DialogTitle>
              <DialogDescription>
                Purchase tickets instantly at the listed price
              </DialogDescription>
            </DialogHeader>
            
            {/* Ticket Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">{listing.title}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Event: {listing.eventName}</div>
                <div>Date: {new Date(listing.eventDate).toLocaleDateString()}</div>
                <div>Seller: {listing.seller.username} ⭐ {listing.seller.rating}/5</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{listing.quantity} available</Badge>
                <Badge className="bg-green-100 text-green-800">Instant Purchase</Badge>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select quantity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: Math.min(listing.quantity, 10) }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1} ticket{i > 0 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your.email@warwick.ac.uk"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Price Breakdown */}
                <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tickets ({watchedQuantity}x)</span>
                    <span>£{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Platform fee (6%)</span>
                    <span>£{platformFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>£{totalWithFees.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Trust Indicators */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>Instant Transfer</span>
                  </div>
                </div>
                
                <DialogFooter className="flex-col space-y-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-purple-700 hover:bg-purple-800"
                    disabled={createOffer.isPending}
                  >
                    {createOffer.isPending ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Buy Now for £{totalWithFees.toFixed(2)}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
        
        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle>Processing Payment</DialogTitle>
              <DialogDescription>
                Please wait while we process your payment securely
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
              <p className="text-sm text-gray-600">Contacting payment processor...</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                🔒 Your payment is secured by our platform
              </div>
            </div>
          </>
        )}
        
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-green-700">Purchase Successful!</DialogTitle>
              <DialogDescription>
                Your payment has been processed and the seller has been notified
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-green-700 font-semibold">✅ Payment Confirmed</div>
                <div className="text-sm text-green-600 mt-1">
                  You will receive the tickets once the seller confirms the transfer
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="font-semibold">Next Steps:</div>
                <div>1. The seller will contact you to arrange ticket transfer</div>
                <div>2. You'll receive an email confirmation shortly</div>
                <div>3. Rate your experience after receiving the tickets</div>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                View My Purchases
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}