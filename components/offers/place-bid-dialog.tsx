"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MessageSquare, TrendingDown, AlertCircle } from 'lucide-react'
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

const placeBidSchema = z.object({
  offerPriceInCents: z.number().min(100, "Minimum offer is £1"),
  quantity: z.number().min(1).max(10),
  messageTemplate: z.enum(['make_offer', 'check_availability']),
  customMessage: z.string().max(500).optional()
})

type PlaceBidFormData = z.infer<typeof placeBidSchema>

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

interface PlaceBidDialogProps {
  listing: Listing
  open: boolean
  onClose: () => void
}

const messageTemplates = {
  make_offer: "I'd like to make an offer for your tickets",
  check_availability: "Are these tickets still available?"
}

export function PlaceBidDialog({ listing, open, onClose }: PlaceBidDialogProps) {
  const createOffer = useCreateOffer()
  
  const form = useForm<PlaceBidFormData>({
    resolver: zodResolver(placeBidSchema),
    defaultValues: {
      offerPriceInCents: Math.round(listing.priceInCents * 0.8), // 80% of asking price
      quantity: 1,
      messageTemplate: 'make_offer',
      customMessage: ''
    }
  })
  
  const watchedOfferPrice = form.watch('offerPriceInCents')
  const watchedQuantity = form.watch('quantity')
  const watchedMessageTemplate = form.watch('messageTemplate')
  
  const askingPrice = listing.priceInCents / 100
  const offerPrice = watchedOfferPrice / 100
  const totalOfferPrice = (watchedOfferPrice * watchedQuantity) / 100
  const discountPercentage = Math.round(((askingPrice - offerPrice) / askingPrice) * 100)
  
  const onSubmit = async (data: PlaceBidFormData) => {
    try {
      await createOffer.mutateAsync({
        listingId: listing.id,
        offerPriceInCents: data.offerPriceInCents * data.quantity,
        quantity: data.quantity,
        messageTemplate: data.messageTemplate,
        customMessage: data.customMessage || messageTemplates[data.messageTemplate]
      })
      
      toast.success('Offer sent successfully!')
      form.reset()
      onClose()
    } catch (error) {
      toast.error('Failed to send offer. Please try again.')
    }
  }
  
  const handleClose = () => {
    form.reset()
    onClose()
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Place Bid
          </DialogTitle>
          <DialogDescription>
            Make an offer or inquire about availability
          </DialogDescription>
        </DialogHeader>
        
        {/* Ticket Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">{listing.title}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Event: {listing.eventName}</div>
            <div>Date: {new Date(listing.eventDate).toLocaleDateString()}</div>
            <div>Seller: {listing.seller.username} ⭐ {listing.seller.rating}/5</div>
            <div>Asking Price: £{askingPrice.toFixed(2)} per ticket</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{listing.quantity} available</Badge>
            <Badge className="bg-blue-100 text-blue-800">Negotiable</Badge>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="messageTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select offer type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="make_offer">Make an Offer</SelectItem>
                      <SelectItem value="check_availability">Check Availability</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchedMessageTemplate === 'make_offer' && (
              <>
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
                  name="offerPriceInCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Offer (per ticket)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="1"
                            max={askingPrice}
                            className="pl-7"
                            value={(field.value / 100).toFixed(2)}
                            onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Asking price: £{askingPrice.toFixed(2)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Price Comparison */}
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Your offer ({watchedQuantity}x)</span>
                    <span>£{totalOfferPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Asking price ({watchedQuantity}x)</span>
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
                      Your offer is {discountPercentage}% below asking price. Consider a higher offer for better acceptance chances.
                    </div>
                  </div>
                )}
              </>
            )}
            
            <FormField
              control={form.control}
              name="customMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchedMessageTemplate === 'make_offer' ? 'Additional Message (Optional)' : 'Your Message'}
                  </FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder={
                        watchedMessageTemplate === 'make_offer' 
                          ? "Any additional details about your offer..." 
                          : "Hi! Are these tickets still available? When would be a good time to pick them up?"
                      }
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
            
            <DialogFooter className="flex-col space-y-2">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                variant={watchedMessageTemplate === 'make_offer' ? 'default' : 'outline'}
                disabled={createOffer.isPending}
              >
                {createOffer.isPending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {watchedMessageTemplate === 'make_offer' 
                      ? `Send Offer (£${totalOfferPrice.toFixed(2)})` 
                      : 'Send Inquiry'
                    }
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}