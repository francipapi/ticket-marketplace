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
  Star,
  Calendar,
  MapPin,
  Users,
  Zap,
  DollarSign,
  ArrowRight,
  X
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
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
import { useCreateOffer } from '@/lib/hooks/use-offers'
import { toast } from 'sonner'
import { format } from 'date-fns'

const purchaseSchema = z.object({
  type: z.enum(['instant', 'offer']),
  quantity: z.number().min(1).max(10),
  offerPriceInCents: z.number().min(100).optional(),
  message: z.string().max(300).optional(),
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

interface ModernPurchaseDialogProps {
  listing: Listing
  open: boolean
  onClose: () => void
}

export function ModernPurchaseDialog({ listing, open, onClose }: ModernPurchaseDialogProps) {
  const [step, setStep] = useState<'select' | 'instant' | 'offer' | 'payment' | 'success'>('select')
  const createOffer = useCreateOffer()
  
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      type: 'instant',
      quantity: 1,
      offerPriceInCents: Math.round(listing.priceInCents * 0.85),
      message: ''
    }
  })
  
  const watchedQuantity = form.watch('quantity')
  const watchedOfferPrice = form.watch('offerPriceInCents') || 0
  
  const askingPrice = listing.priceInCents / 100
  const offerPrice = watchedOfferPrice / 100
  const totalPrice = (listing.priceInCents * watchedQuantity) / 100
  const totalOfferPrice = (watchedOfferPrice * watchedQuantity) / 100
  const platformFee = totalPrice * 0.06
  const totalWithFees = totalPrice + platformFee
  const discountPercentage = Math.round(((askingPrice - offerPrice) / askingPrice) * 100)
  
  const handleOptionSelect = (type: 'instant' | 'offer') => {
    form.setValue('type', type)
    setStep(type)
  }
  
  const onSubmit = async (data: PurchaseFormData) => {
    try {
      const isInstantPurchase = data.type === 'instant'
      
      await createOffer.mutateAsync({
        listingId: listing.id,
        offerPriceInCents: isInstantPurchase 
          ? listing.priceInCents * data.quantity
          : data.offerPriceInCents! * data.quantity,
        quantity: data.quantity,
        messageTemplate: isInstantPurchase ? 'asking_price' : 'make_offer',
        customMessage: data.message || (
          isInstantPurchase 
            ? `Instant purchase of ${data.quantity} ticket(s)`
            : `Offering £${offerPrice.toFixed(2)} per ticket - ${data.message || 'Looking forward to the event!'}`
        )
      })
      
      if (isInstantPurchase) {
        setStep('payment')
        setTimeout(() => {
          setStep('success')
          toast.success('Purchase completed successfully!')
        }, 2500)
      } else {
        toast.success('Offer sent successfully!')
        handleClose()
      }
    } catch (error) {
      toast.error('Failed to process request. Please try again.')
    }
  }
  
  const handleClose = () => {
    setStep('select')
    form.reset()
    onClose()
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-white [&>button]:hidden">
        <div className="overflow-y-auto max-h-[90vh]">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Purchase Tickets</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>
        {step === 'select' && (
          <div className="relative bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 pr-16">
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 z-10"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{listing.title}</h2>
                  <div className="space-y-1 text-white">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(listing.eventDate), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{listing.seller.username}</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="text-sm">{listing.seller.rating}/5</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">£{askingPrice.toFixed(2)}</div>
                  <div className="text-white text-sm">per ticket</div>
                  <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-0">
                    {listing.quantity} available
                  </Badge>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="p-6 space-y-6 bg-white">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">How would you like to purchase?</h3>
              
              {/* Instant Purchase Option */}
              <div 
                onClick={() => handleOptionSelect('instant')}
                className="relative p-6 border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all duration-200 group bg-white shadow-sm hover:shadow-md"
              >
                <div className="absolute top-4 right-4">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Instant
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors flex-shrink-0">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">Buy Now</h4>
                    <p className="text-gray-900 mb-3">
                      Purchase immediately at the asking price. Get your tickets right away!
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-800">
                      <div className="flex items-center gap-1">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span>Secure payment</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>Instant delivery</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                </div>
              </div>

              {/* Make Offer Option */}
              <div 
                onClick={() => handleOptionSelect('offer')}
                className="relative p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group bg-white shadow-sm hover:shadow-md"
              >
                <div className="absolute top-4 right-4">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Save money
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors flex-shrink-0">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">Make an Offer</h4>
                    <p className="text-gray-900 mb-3">
                      Negotiate a lower price. The seller can accept, reject, or counter your offer.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-800">
                      <div className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-green-500" />
                        <span>Potential savings</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span>Direct negotiation</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'instant' && (
          <div className="relative bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 pl-16 pr-16">
              <button 
                onClick={() => setStep('select')}
                className="absolute top-4 left-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 z-10"
              >
                <ArrowRight className="h-5 w-5 rotate-180" />
              </button>
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 z-10"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-6 w-6" />
                  <h2 className="text-2xl font-bold">Instant Purchase</h2>
                </div>
                <p className="text-white/90">Complete your purchase in seconds</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 bg-white">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold text-gray-900">Number of tickets</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg">
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

                {/* Price Summary */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-4">Order Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-lg text-gray-900">
                      <span>Tickets ({watchedQuantity}×)</span>
                      <span>£{totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-900">
                      <span>Platform fee (6%)</span>
                      <span>£{platformFee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-purple-300 pt-3 flex justify-between text-xl font-bold text-purple-900">
                      <span>Total</span>
                      <span>£{totalWithFees.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('select')}
                    className="flex-1 h-12"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 h-12 text-lg font-semibold transition-colors duration-200"
                    disabled={createOffer.isPending}
                  >
                    {createOffer.isPending ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Buy for £{totalWithFees.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {step === 'offer' && (
          <div className="relative bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 pl-16 pr-16">
              <button 
                onClick={() => setStep('select')}
                className="absolute top-4 left-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 z-10"
              >
                <ArrowRight className="h-5 w-5 rotate-180" />
              </button>
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors duration-200 z-10"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MessageSquare className="h-6 w-6" />
                  <h2 className="text-2xl font-bold">Make an Offer</h2>
                </div>
                <p className="text-white/90">Negotiate a price that works for you</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-900">Quantity</FormLabel>
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
                        <FormLabel className="text-gray-900">Your offer per ticket</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-900 font-medium">£</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="1"
                              max={askingPrice}
                              className="pl-7 bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              value={(field.value! / 100).toFixed(2)}
                              onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-gray-800">
                          Asking price: £{askingPrice.toFixed(2)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Price Comparison */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-4">Offer Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-900">
                      <span>Your offer ({watchedQuantity}×)</span>
                      <span className="font-semibold">£{totalOfferPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-900">
                      <span>Asking price ({watchedQuantity}×)</span>
                      <span>£{(askingPrice * watchedQuantity).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-blue-300 pt-3 flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1 text-gray-900">
                        <TrendingDown className="h-4 w-4 text-green-600" />
                        You save
                      </span>
                      <span className="font-semibold text-green-700 text-lg">
                        £{((askingPrice - offerPrice) * watchedQuantity).toFixed(2)} ({discountPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>

                {discountPercentage > 30 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      Your offer is {discountPercentage}% below asking price. Consider increasing it for better acceptance chances.
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900">Message to seller (optional)</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          placeholder="Hi! I'm interested in your tickets. Looking forward to the event!"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-800">
                        {300 - (field.value?.length || 0)} characters remaining
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('select')}
                    className="flex-1 h-12"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 font-semibold transition-colors duration-200"
                    disabled={createOffer.isPending}
                  >
                    {createOffer.isPending ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-5 w-5" />
                        Send Offer (£{totalOfferPrice.toFixed(2)})
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {step === 'payment' && (
          <div className="p-8 text-center bg-white">
            <div className="mb-6">
              <div className="relative mx-auto w-20 h-20 mb-4">
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
                <CreditCard className="absolute inset-0 m-auto h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold text-purple-900 mb-2">Processing Your Payment</h3>
              <p className="text-gray-900">Please wait while we securely process your transaction</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              🔒 Your payment is protected by bank-level security
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 text-center bg-white">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-green-700 mb-2">Purchase Successful!</h3>
              <p className="text-gray-900">Your tickets have been secured and the seller has been notified</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-green-800 mb-3">What happens next?</h4>
              <div className="text-left space-y-2 text-sm text-green-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>You'll receive an email confirmation within minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>The seller will contact you to arrange ticket delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Rate your experience after receiving the tickets</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Continue Browsing
              </Button>
              <Button onClick={handleClose} className="flex-1 bg-purple-600 hover:bg-purple-700 transition-colors duration-200">
                View My Purchases
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}