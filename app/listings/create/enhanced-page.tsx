"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { TicketUpload } from '@/components/tickets/ticket-upload'

const createListingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  eventName: z.string().min(3, 'Event name must be at least 3 characters'),
  eventDate: z.string().refine(val => new Date(val) > new Date(), 'Event date must be in the future'),
  venue: z.string().optional(),
  priceInCents: z.number().min(100, 'Minimum price is £1').max(100000, 'Maximum price is £1000'),
  quantity: z.number().min(1, 'Minimum quantity is 1').max(10, 'Maximum quantity is 10'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  ticketType: z.string().optional(),
})

type CreateListingFormData = z.infer<typeof createListingSchema>

const steps = [
  { id: 'upload', label: 'Upload Tickets', description: 'Scan or upload your ticket images' },
  { id: 'details', label: 'Event Details', description: 'Fill in event information' },
  { id: 'pricing', label: 'Set Price', description: 'Price and quantity settings' },
  { id: 'review', label: 'Review', description: 'Review and submit your listing' }
]

export default function EnhancedCreateListingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateListingFormData>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: '',
      eventName: '',
      eventDate: '',
      venue: '',
      priceInCents: 1000, // £10 default
      quantity: 1,
      description: '',
      ticketType: ''
    }
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in')
    }
  }, [user, loading, router])

  const handleOCRExtraction = (extractedData: any) => {
    // Auto-fill form with OCR data
    if (extractedData.eventName) {
      form.setValue('eventName', extractedData.eventName)
      if (!form.getValues('title')) {
        form.setValue('title', `${extractedData.eventName} Tickets`)
      }
    }
    if (extractedData.eventDate) {
      // Try to parse and format the date
      try {
        const date = new Date(extractedData.eventDate)
        if (!isNaN(date.getTime())) {
          form.setValue('eventDate', date.toISOString().split('T')[0])
        }
      } catch (error) {
        console.log('Could not parse extracted date:', extractedData.eventDate)
      }
    }
    if (extractedData.venue) {
      form.setValue('venue', extractedData.venue)
    }
    if (extractedData.ticketType) {
      form.setValue('ticketType', extractedData.ticketType)
    }
    
    // Move to next step if we got good data
    if (extractedData.eventName && extractedData.confidence > 60) {
      toast.success('Event details extracted! Please review and continue.')
      setTimeout(() => setCurrentStep(1), 1000)
    }
  }

  const nextStep = async () => {
    const stepFields = getStepFields(currentStep)
    const isValid = await form.trigger(stepFields)
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const getStepFields = (step: number): (keyof CreateListingFormData)[] => {
    switch (step) {
      case 0: return [] // Upload step has no form validation
      case 1: return ['title', 'eventName', 'eventDate']
      case 2: return ['priceInCents', 'quantity']
      case 3: return [] // Review step
      default: return []
    }
  }

  const onSubmit = async (data: CreateListingFormData) => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one ticket image')
      return
    }

    setIsSubmitting(true)
    try {
      // First upload files
      const fileFormData = new FormData()
      uploadedFiles.forEach(file => {
        fileFormData.append('files', file)
      })

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: fileFormData
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload files')
      }

      const { uploadedFiles: fileData } = await uploadResponse.json()

      // Then create listing
      const listingResponse = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ticketFiles: fileData
        })
      })

      if (!listingResponse.ok) {
        throw new Error('Failed to create listing')
      }

      const result = await listingResponse.json()
      toast.success('Listing created successfully!')
      router.push(`/listings/${result.id}`)
    } catch (error) {
      console.error('Error creating listing:', error)
      toast.error('Failed to create listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-purple-700 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/browse"
            className="inline-flex items-center text-purple-600 hover:text-purple-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to browse
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">List Your Tickets</h1>
          <p className="text-gray-600">
            Follow these steps to create your ticket listing. Use our OCR scanner for quick setup!
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      index < currentStep
                        ? 'bg-purple-700 border-purple-700 text-white'
                        : index === currentStep
                        ? 'border-purple-700 text-purple-700'
                        : 'border-gray-300 text-gray-300'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${
                      index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${
                    index < currentStep ? 'bg-purple-700' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step Content */}
            <Card>
              <CardContent className="p-6">
                {currentStep === 0 && (
                  <UploadStep 
                    onExtracted={handleOCRExtraction}
                    onFileUploaded={(file) => setUploadedFiles(prev => [...prev, file])}
                    uploadedFiles={uploadedFiles}
                    onRemoveFile={(index) => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                  />
                )}
                
                {currentStep === 1 && <DetailsStep form={form} />}
                {currentStep === 2 && <PricingStep form={form} />}
                {currentStep === 3 && <ReviewStep data={form.getValues()} uploadedFiles={uploadedFiles} />}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Listing'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

// Step Components
function UploadStep({ 
  onExtracted, 
  onFileUploaded, 
  uploadedFiles, 
  onRemoveFile 
}: {
  onExtracted: (data: any) => void
  onFileUploaded: (file: File) => void
  uploadedFiles: File[]
  onRemoveFile: (index: number) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Upload Your Tickets</h2>
        <p className="text-gray-600">
          Upload photos of your tickets. Our OCR scanner will automatically extract event details.
        </p>
      </div>
      
      <TicketUpload 
        onExtracted={onExtracted}
        onFileUploaded={onFileUploaded}
      />
      
      {uploadedFiles.length > 0 && (
        <div>
          <h3 className="font-medium mb-3">Uploaded Files ({uploadedFiles.length})</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">{file.name}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveFile(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailsStep({ form }: { form: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Event Details</h2>
        <p className="text-gray-600">
          Provide information about the event. Some fields may be auto-filled from your ticket scan.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Listing Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Warwick Summer Ball Tickets" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="eventName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Warwick Summer Ball" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="venue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Warwick Arts Centre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (Optional)</FormLabel>
            <FormControl>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Any additional details about the tickets..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function PricingStep({ form }: { form: any }) {
  const watchedPrice = form.watch('priceInCents')
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Pricing & Quantity</h2>
        <p className="text-gray-600">
          Set your price and specify how many tickets you're selling.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="priceInCents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price per ticket (£)</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    max="1000"
                    className="pl-7"
                    value={(field.value / 100).toFixed(2)}
                    onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Minimum £1, maximum £1000 per ticket
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of tickets</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quantity" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => (
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
      </div>
      
      {/* Price Preview */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h3 className="font-medium mb-2">Price Breakdown</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Your price per ticket:</span>
            <span>£{(watchedPrice / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Platform fee (6%):</span>
            <span>£{((watchedPrice * 0.06) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium pt-1 border-t">
            <span>You receive:</span>
            <span>£{((watchedPrice * 0.94) / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewStep({ data, uploadedFiles }: { data: CreateListingFormData; uploadedFiles: File[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Review Your Listing</h2>
        <p className="text-gray-600">
          Please review all details before submitting your listing.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-3">Event Information</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Title:</dt>
              <dd>{data.title}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Event:</dt>
              <dd>{data.eventName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Date:</dt>
              <dd>{new Date(data.eventDate).toLocaleDateString()}</dd>
            </div>
            {data.venue && (
              <div>
                <dt className="text-gray-500">Venue:</dt>
                <dd>{data.venue}</dd>
              </div>
            )}
          </dl>
        </div>
        
        <div>
          <h3 className="font-medium mb-3">Pricing</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Price per ticket:</dt>
              <dd>£{(data.priceInCents / 100).toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Quantity:</dt>
              <dd>{data.quantity} ticket{data.quantity !== 1 ? 's' : ''}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Total value:</dt>
              <dd>£{((data.priceInCents * data.quantity) / 100).toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </div>
      
      <div>
        <h3 className="font-medium mb-3">Uploaded Files</h3>
        <p className="text-sm text-gray-600">{uploadedFiles.length} file(s) uploaded</p>
      </div>
      
      {data.description && (
        <div>
          <h3 className="font-medium mb-3">Description</h3>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{data.description}</p>
        </div>
      )}
    </div>
  )
}