"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Loader2, 
  CreditCard, 
  MessageSquare, 
  Shield, 
  Clock, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCreateOffer } from '@/lib/hooks/use-offers'
import { toast } from 'sonner'

const purchaseSchema = z.object({
  type: z.enum(['buy_now', 'make_offer', 'check_availability']),
  quantity: z.number().min(1).max(10),
  offerPriceInCents: z.number().min(100).optional(),
  contactEmail: z.string().email().optional(),
  customMessage: z.string().max(500).optional(),
})

type PurchaseFormData = z.infer<typeof purchaseSchema>

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

interface UnifiedPurchaseDialogProps {
  listing: Listing
  open: boolean
  onClose: () => void
}

export function UnifiedPurchaseDialog({ listing, open, onClose }: UnifiedPurchaseDialogProps) {
  const [step, setStep] = useState<'purchase' | 'payment' | 'success'>('purchase')
  const [activeTab, setActiveTab] = useState<'buy_now' | 'make_offer'>('buy_now')
  const createOffer = useCreateOffer()
  
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      type: 'buy_now',
      quantity: 1,
      offerPriceInCents: Math.round(listing.priceInCents * 0.8),
      contactEmail: '',
      customMessage: ''
    }
  })
  
  const watchedType = form.watch('type')
  const watchedQuantity = form.watch('quantity')
  const watchedOfferPrice = form.watch('offerPriceInCents') || 0
  
  const askingPrice = listing.priceInCents / 100
  const offerPrice = watchedOfferPrice / 100
  const totalPrice = (listing.priceInCents * watchedQuantity) / 100
  const totalOfferPrice = (watchedOfferPrice * watchedQuantity) / 100
  const platformFee = totalPrice * 0.06
  const totalWithFees = totalPrice + platformFee
  const discountPercentage = Math.round(((askingPrice - offerPrice) / askingPrice) * 100)
  
  const onSubmit = async (data: PurchaseFormData) => {
    try {
      const isInstantPurchase = data.type === 'buy_now'
      
      await createOffer.mutateAsync({
        listingId: listing.id,
        offerPriceInCents: isInstantPurchase 
          ? listing.priceInCents * data.quantity
          : data.offerPriceInCents! * data.quantity,
        quantity: data.quantity,
        messageTemplate: data.type === 'buy_now' ? 'asking_price' : data.type,
        customMessage: data.customMessage || (
          data.type === 'buy_now' 
            ? `Buying ${data.quantity} ticket(s) at asking price`
            : data.type === 'make_offer'
              ? `Offering ${offerPrice.toFixed(2)} per ticket`
              : 'Are these tickets still available?'
        )
      })
      
      if (isInstantPurchase) {
        setStep('payment')
        setTimeout(() => {
          setStep('success')
          toast.success('Purchase completed successfully!')
        }, 2000)
      } else {
        toast.success('Offer sent successfully!')
        handleClose()
      }
    } catch (error) {
      toast.error('Failed to process request. Please try again.')
    }
  }
  
  const handleClose = () => {
    setStep('purchase')
    setActiveTab('buy_now')
    form.reset()
    onClose()
  }
  
  const handleTabChange = (value: string) => {
    if (value === 'buy_now' || value === 'make_offer') {
      setActiveTab(value)
      form.setValue('type', value)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'purchase' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-purple-900">
                Get Your Tickets
              </DialogTitle>
              <DialogDescription>
                Choose how you'd like to purchase these tickets
              </DialogDescription>
            </DialogHeader>
            
            {/* Ticket Info Card */}
            <div className="bg-gradient-to-r from-purple-50 to-amber-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-1">{listing.title}</h3>
                  <p className="text-purple-700 text-sm mb-2">{listing.eventName}</p>
                  <div className="flex items-center gap-4 text-sm text-purple-600">
                    <span>{new Date(listing.eventDate).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{listing.seller.username} ⭐ {listing.seller.rating}/5</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-900">
                    £{askingPrice.toFixed(2)}
                  </div>
                  <div className="text-sm text-purple-600">per ticket</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {listing.quantity} available
                </Badge>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy_now" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Buy Now
                </TabsTrigger>
                <TabsTrigger value="make_offer" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Make Offer
                </TabsTrigger>
              </TabsList>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <TabsContent value="buy_now" className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Instant Purchase</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Get your tickets immediately at the listed price
                      </p>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of tickets</FormLabel>
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
                    
                    {/* Price Breakdown */}
                    <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Tickets ({watchedQuantity}×)</span>
                        <span>£{totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Platform fee (6%)</span>
                        <span>£{platformFee.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-purple-700">£{totalWithFees.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Trust indicators */}
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
                  </TabsContent>
                  
                  <TabsContent value="make_offer" className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-800">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium">Negotiate Price</span>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        Make an offer below the asking price
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
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
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: Math.min(listing.quantity, 10) }, (_, i) => (
                                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                                    {i + 1}
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
                        name="offerPriceInCents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your offer per ticket</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="1"
                                  max={askingPrice}
                                  className="pl-7"
                                  value={(field.value! / 100).toFixed(2)}
                                  onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Price Comparison */}
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Your offer ({watchedQuantity}×)</span>
                        <span>£{totalOfferPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Asking price ({watchedQuantity}×)</span>
                        <span>£{(askingPrice * watchedQuantity).toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between items-center">
                        <span className="font-semibold flex items-center gap-1">
                          <TrendingDown className="h-4 w-4 text-green-600" />
                          You save
                        </span>
                        <span className="font-semibold text-green-600">
                          £{((askingPrice - offerPrice) * watchedQuantity).toFixed(2)} ({discountPercentage}%)
                        </span>
                      </div>
                    </div>
                    
                    {discountPercentage > 30 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          Your offer is {discountPercentage}% below asking price. Consider increasing it for better acceptance chances.
                        </div>
                      </div>
                    )}
                    
                    <FormField
                      control={form.control}
                      name="customMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message to seller (optional)</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              placeholder="Any additional details about your offer..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {500 - (field.value?.length || 0)} characters remaining
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <div className="flex flex-col gap-2 pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      className={`w-full ${activeTab === 'buy_now' 
                        ? 'bg-purple-700 hover:bg-purple-800' 
                        : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      disabled={createOffer.isPending}
                    >
                      {createOffer.isPending ? (
                        <>
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                          Processing...
                        </>
                      ) : activeTab === 'buy_now' ? (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Buy Now for £{totalWithFees.toFixed(2)}
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Send Offer (£{totalOfferPrice.toFixed(2)})
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </Tabs>
          </>
        )}
        
        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-purple-900">Processing Payment</DialogTitle>
              <DialogDescription>
                Please wait while we process your payment securely
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <div className="h-16 w-16 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute top-0 left-0 h-16 w-16 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-purple-900">Securing your purchase</p>
                <p className="text-sm text-gray-600">This may take a few moments</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 text-center">
                🔒 Your payment is protected by our secure platform
              </div>
            </div>
          </>
        )}
        
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-green-700 flex items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                Purchase Successful!
              </DialogTitle>
              <DialogDescription>
                Your payment has been processed and the seller has been notified
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-green-700 font-semibold text-lg">✅ Payment Confirmed</div>
                <div className="text-sm text-green-600 mt-2">
                  You will receive the tickets once the seller confirms the transfer
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="font-semibold text-gray-900">What happens next:</div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                    <span>The seller will contact you to arrange ticket transfer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                    <span>You'll receive an email confirmation shortly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                    <span>Rate your experience after receiving the tickets</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleClose} className="flex-1">
                View My Purchases
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}