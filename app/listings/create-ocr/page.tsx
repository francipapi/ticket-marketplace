"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, Camera, Upload, Sparkles, Edit3, Eye } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  eventDate: z.string().refine(val => val.length > 0, 'Event date is required'),
  venue: z.string().optional(),
  priceInCents: z.number().min(100, 'Minimum price is £1').max(100000, 'Maximum price is £1000'),
  quantity: z.number().min(1, 'Minimum quantity is 1').max(10, 'Maximum quantity is 10'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  ticketType: z.string().optional(),
})

type CreateListingFormData = z.infer<typeof createListingSchema>

const steps = [
  { id: 'scan', label: 'Scan Ticket', description: 'Upload and scan your ticket' },
  { id: 'review', label: 'Review & Edit', description: 'Verify extracted information' },
  { id: 'pricing', label: 'Set Price', description: 'Set your selling price' },
  { id: 'preview', label: 'Preview', description: 'Preview your listing' }
]

export default function OCRCreateListingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ocrData, setOcrData] = useState<any>(null)
  const [ocrConfidence, setOcrConfidence] = useState(0)
  const [showDebug, setShowDebug] = useState(false)

  const form = useForm<CreateListingFormData>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: '',
      eventName: '',
      eventDate: '',
      venue: '',
      priceInCents: 2000, // £20 default
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
    console.log('🎯 OCR extracted data:', extractedData)
    console.log('🔍 Current form values before OCR:', form.getValues())
    console.log('🔍 Form object test:', {
      setValue: typeof form.setValue,
      getValues: typeof form.getValues,
      trigger: typeof form.trigger,
      formState: form.formState
    })
    setOcrData(extractedData)
    setOcrConfidence(extractedData.confidence)
    
    // Auto-fill form with OCR data with better error handling
    let fieldsPopulated = 0
    
    if (extractedData.eventName && extractedData.eventName.trim().length > 0) {
      const cleanEventName = extractedData.eventName.trim()
      console.log('📝 Setting eventName to:', cleanEventName)
      form.setValue('eventName', cleanEventName, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true 
      })
      // Generate a smart title
      const title = `${cleanEventName} Tickets`
      console.log('📝 Setting title to:', title)
      form.setValue('title', title, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true 
      })
      fieldsPopulated++
      console.log('✅ Set eventName:', cleanEventName)
      console.log('✅ Set title:', title)
    }
    
    if (extractedData.eventDate && extractedData.eventDate.trim().length > 0) {
      console.log('🔄 Processing extracted date:', extractedData.eventDate)
      try {
        // Try multiple date parsing approaches
        let parsedDate = null
        
        // Approach 1: Direct parsing if already in ISO format
        if (extractedData.eventDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          parsedDate = new Date(extractedData.eventDate)
          console.log('📅 ISO format detected')
        }
        // Approach 2: Handle "Saturday, 28 Oct 2023" format
        else if (extractedData.eventDate.match(/[A-Za-z]+,?\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}/)) {
          const dateMatch = extractedData.eventDate.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
          if (dateMatch) {
            const [, day, month, year] = dateMatch
            const monthMap: { [key: string]: number } = {
              'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
              'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
              'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
              'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
            }
            const monthNum = monthMap[month.toLowerCase().substring(0, 3)]
            if (monthNum !== undefined) {
              parsedDate = new Date(parseInt(year), monthNum, parseInt(day))
              console.log('📅 Mobile ticket format parsed')
            }
          }
        }
        // Approach 3: Try native Date parsing
        else {
          parsedDate = new Date(extractedData.eventDate)
        }
        
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          // Fix timezone issue - use local date instead of UTC conversion
          const year = parsedDate.getFullYear()
          const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
          const day = String(parsedDate.getDate()).padStart(2, '0')
          const isoDate = `${year}-${month}-${day}`
          console.log('📝 Setting eventDate to:', isoDate)
          form.setValue('eventDate', isoDate, { 
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true 
          })
          fieldsPopulated++
          console.log('✅ Set eventDate:', isoDate)
          
          // Show warning if date is in the past
          if (parsedDate <= new Date()) {
            toast.warning('This event appears to be in the past. Please verify the date.')
          }
        } else {
          console.log('⚠️ Date parsing failed:', extractedData.eventDate)
          // Still set the raw date for manual correction
          form.setValue('eventDate', '')
          toast.warning('Please check and correct the event date')
        }
      } catch (error) {
        console.log('❌ Date parsing error:', error, 'Raw date:', extractedData.eventDate)
        form.setValue('eventDate', '')
      }
    }
    
    if (extractedData.venue && extractedData.venue.trim().length > 0) {
      const cleanVenue = extractedData.venue.trim()
      console.log('📝 Setting venue to:', cleanVenue)
      form.setValue('venue', cleanVenue, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true 
      })
      fieldsPopulated++
      console.log('✅ Set venue:', cleanVenue)
    }
    
    if (extractedData.ticketType && extractedData.ticketType.trim().length > 0) {
      const cleanTicketType = extractedData.ticketType.trim()
      console.log('📝 Setting ticketType to:', cleanTicketType)
      form.setValue('ticketType', cleanTicketType, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true 
      })
      fieldsPopulated++
      console.log('✅ Set ticketType:', cleanTicketType)
    }
    
    // Force form validation refresh and log results
    setTimeout(() => {
      console.log('🔍 Form values after OCR population:', form.getValues())
      console.log('🔍 Form errors before trigger:', form.formState.errors)
      form.trigger(['eventName', 'eventDate', 'title']).then((isValid) => {
        console.log('✅ Form validation result:', isValid)
        console.log('🔍 Form errors after trigger:', form.formState.errors)
      })
    }, 100)
    
    console.log(`📊 Populated ${fieldsPopulated} fields from OCR`)
    
    // Show appropriate feedback and auto-advance logic
    console.log(`📊 Auto-advance check: fieldsPopulated=${fieldsPopulated}, confidence=${extractedData.confidence}`)
    console.log(`📊 Essential fields: eventName="${extractedData.eventName}", eventDate="${extractedData.eventDate}"`)
    
    // More permissive auto-advance logic
    const shouldAutoAdvance = (fieldsPopulated >= 1 && extractedData.confidence > 40) || 
                             (fieldsPopulated >= 2) ||
                             (extractedData.eventName && extractedData.eventDate)
    
    if (shouldAutoAdvance) {
      if (fieldsPopulated >= 2 && extractedData.confidence > 70) {
        toast.success(`Great! Extracted ${fieldsPopulated} fields with high confidence.`)
      } else {
        toast.success(`Extracted ${fieldsPopulated} fields. Moving to review step.`)
      }
      
      console.log('🚀 Auto-advancing to review step in 2 seconds...')
      setTimeout(() => {
        console.log('🚀 Moving to step 1 (review)')
        setCurrentStep(1)
        toast.info('Please review and verify the extracted information.')
      }, 2000)
      
    } else if (fieldsPopulated >= 1) {
      toast.success(`Extracted ${fieldsPopulated} fields. Click Next to review and complete.`)
    } else {
      toast.warning('OCR found limited information. Please fill in the fields manually.')
      // Still allow manual progression
      setTimeout(() => {
        toast.info('You can fill in the details manually in the next step.')
      }, 1000)
    }
    
    // Show confidence feedback
    if (extractedData.confidence > 80) {
      console.log('🎯 High confidence OCR result')
    } else if (extractedData.confidence > 60) {
      console.log('⚠️ Medium confidence OCR result')
    } else {
      console.log('🔍 Low confidence OCR result')
    }
    
    // Show personal info warning
    if (extractedData.hasPersonalInfo) {
      toast.warning('Personal information detected. We\'ve hidden it for your privacy.')
    }
  }

  const nextStep = async () => {
    const stepValidation = await validateCurrentStep()
    if (stepValidation) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const validateCurrentStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 0: // Scan step
        if (uploadedFiles.length === 0) {
          toast.error('Please upload at least one ticket image')
          return false
        }
        return true
      case 1: // Review step
        console.log('🔍 Validating review step...')
        const formValues = form.getValues()
        console.log('📋 Current form values:', formValues)
        
        const reviewFields = ['eventName', 'eventDate'] as const
        const isValid = await form.trigger(reviewFields)
        
        if (!isValid) {
          const errors = form.formState.errors
          console.log('❌ Form validation errors:', errors)
          
          const missingFields = []
          if (errors.eventName) missingFields.push('Event Name')
          if (errors.eventDate) missingFields.push('Event Date')
          
          if (missingFields.length > 0) {
            toast.error(`Please fill in: ${missingFields.join(', ')}`)
          } else {
            toast.error('Please check the required fields')
          }
        } else {
          console.log('✅ Review step validation passed')
        }
        return isValid
      case 2: // Pricing step
        console.log('🔍 Validating pricing step...')
        const pricingFields = ['priceInCents', 'quantity'] as const
        const pricingValid = await form.trigger(pricingFields)
        if (!pricingValid) {
          const errors = form.formState.errors
          console.log('❌ Pricing validation errors:', errors)
          toast.error('Please set a valid price and quantity')
        }
        return pricingValid
      default:
        return true
    }
  }

  const onSubmit = async (data: CreateListingFormData) => {
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
      // Convert eventDate to datetime format for API validation
      const listingData = {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate + 'T00:00:00.000Z').toISOString() : new Date().toISOString(),
        ticketFiles: fileData
      }
      
      console.log('📤 Sending listing data:', listingData)
      
      const listingResponse = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingData)
      })

      if (!listingResponse.ok) {
        const errorData = await listingResponse.json()
        console.error('❌ Listing creation failed:', errorData)
        throw new Error(`Failed to create listing: ${errorData.error || 'Unknown error'}`)
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
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-purple-600 to-gold-500 p-3 rounded-full">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Ticket Listing</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Simply scan your ticket and our AI will extract all the details automatically. 
              No more typing everything manually!
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      index < currentStep
                        ? 'bg-purple-700 border-purple-700 text-white'
                        : index === currentStep
                        ? 'border-purple-700 text-purple-700 bg-purple-50'
                        : 'border-gray-300 text-gray-300'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="h-6 w-6" />
                    ) : index === 0 ? (
                      <Camera className="h-6 w-6" />
                    ) : index === 1 ? (
                      <Edit3 className="h-6 w-6" />
                    ) : index === 2 ? (
                      <span className="text-xl font-bold">£</span>
                    ) : (
                      <Eye className="h-6 w-6" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${
                      index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block max-w-20">
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
          <form onSubmit={(e) => {
            e.preventDefault()
            // Only submit if we're on the final step
            if (currentStep === steps.length - 1) {
              form.handleSubmit(onSubmit)(e)
            }
          }}>
            {/* Step Content */}
            <Card className="mb-8">
              <CardContent className="p-8">
                {currentStep === 0 && (
                  <ScanStep 
                    onExtracted={handleOCRExtraction}
                    onFileUploaded={(file) => setUploadedFiles(prev => [...prev, file])}
                    uploadedFiles={uploadedFiles}
                    onRemoveFile={(index) => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                  />
                )}
                
                {currentStep === 1 && (
                  <ReviewStep 
                    form={form} 
                    ocrData={ocrData} 
                    confidence={ocrConfidence}
                    showDebug={showDebug}
                    setShowDebug={setShowDebug}
                  />
                )}
                
                {currentStep === 2 && <PricingStep form={form} />}
                {currentStep === 3 && <PreviewStep data={form.getValues()} uploadedFiles={uploadedFiles} />}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  className="bg-purple-700 hover:bg-purple-800 flex items-center"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-purple-700 hover:bg-purple-800"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Create Listing
                    </>
                  )}
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
function ScanStep({ 
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
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Scan Your Ticket</h2>
        <p className="text-gray-600">
          Take a clear photo or upload an image of your ticket. Our AI will automatically extract all the event details.
        </p>
      </div>
      
      <TicketUpload 
        onExtracted={onExtracted}
        onFileUploaded={onFileUploaded}
      />
      
      {uploadedFiles.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-3 flex items-center">
            <Check className="h-5 w-5 mr-2" />
            Uploaded Files ({uploadedFiles.length})
          </h3>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-sm text-gray-700">{file.name}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveFile(index)}
                  className="text-red-600 hover:text-red-700"
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

function ReviewStep({ 
  form, 
  ocrData, 
  confidence, 
  showDebug, 
  setShowDebug 
}: { 
  form: any; 
  ocrData: any; 
  confidence: number;
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Review Extracted Details</h2>
        <p className="text-gray-600">
          Check the automatically extracted information and make any necessary corrections.
        </p>
        
        {confidence > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <Badge 
              variant="secondary"
              className={
                confidence > 80 ? 'bg-green-100 text-green-800' :
                confidence > 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }
            >
              {confidence > 80 ? '🎯 High Confidence' :
               confidence > 60 ? '⚠️ Medium Confidence' :
               '🔍 Low Confidence'}
              ({confidence.toFixed(0)}%)
            </Badge>
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </Button>
          </div>
        )}
        
        {showDebug && ocrData && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-medium mb-2">Debug Information:</h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Raw OCR Text:</strong>
                <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                  {ocrData.rawText || 'No raw text available'}
                </pre>
              </div>
              <div>
                <strong>Extracted Data:</strong>
                <pre className="mt-1 p-2 bg-white rounded text-xs">
                  {JSON.stringify(ocrData, null, 2)}
                </pre>
              </div>
              <div>
                <strong>Current Form Values:</strong>
                <pre className="mt-1 p-2 bg-white rounded text-xs">
                  {JSON.stringify(form.getValues(), null, 2)}
                </pre>
              </div>
              <div>
                <strong>Form Errors:</strong>
                <pre className="mt-1 p-2 bg-white rounded text-xs">
                  {JSON.stringify(form.formState.errors, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="eventName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Event Name
                {ocrData?.eventName && <Badge variant="outline" className="text-xs">Auto-filled</Badge>}
              </FormLabel>
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
              <FormLabel className="flex items-center gap-2">
                Event Date
                {ocrData?.eventDate && <Badge variant="outline" className="text-xs">Auto-filled</Badge>}
              </FormLabel>
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
              <FormLabel className="flex items-center gap-2">
                Venue
                {ocrData?.venue && <Badge variant="outline" className="text-xs">Auto-filled</Badge>}
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Warwick Arts Centre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="ticketType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Ticket Type
                {ocrData?.ticketType && <Badge variant="outline" className="text-xs">Auto-filled</Badge>}
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. General Admission, VIP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Listing Title</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Warwick Summer Ball Tickets" {...field} />
            </FormControl>
            <FormDescription>
              This is how your listing will appear to buyers
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (Optional)</FormLabel>
            <FormControl>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
  const watchedQuantity = form.watch('quantity')
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Set Your Price</h2>
        <p className="text-gray-600">
          Set a competitive price for your tickets. You can always adjust it later.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
        <FormField
          control={form.control}
          name="priceInCents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price per ticket</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    max="1000"
                    className="pl-7 text-lg"
                    value={(field.value / 100).toFixed(2)}
                    onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Minimum £1, maximum £1000
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
                  <SelectTrigger className="text-lg">
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
      <div className="bg-purple-50 rounded-lg p-6 max-w-md mx-auto">
        <h3 className="font-semibold mb-4 text-center">Pricing Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Your price ({watchedQuantity}x):</span>
            <span className="font-semibold">£{((watchedPrice * watchedQuantity) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Platform fee (6%):</span>
            <span>£{((watchedPrice * watchedQuantity * 0.06) / 100).toFixed(2)}</span>
          </div>
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>You receive:</span>
            <span className="text-green-600">£{((watchedPrice * watchedQuantity * 0.94) / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewStep({ data, uploadedFiles }: { data: CreateListingFormData; uploadedFiles: File[] }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Preview Your Listing</h2>
        <p className="text-gray-600">
          This is how your listing will appear to potential buyers
        </p>
      </div>
      
      {/* Preview Card */}
      <div className="max-w-md mx-auto">
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
          <div className="h-32 bg-gradient-to-br from-purple-500 to-gold-500 relative">
            <div className="absolute top-2 right-2">
              <Badge variant="secondary">
                {data.quantity} available
              </Badge>
            </div>
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {data.title}
            </h3>
            <p className="text-gray-600 mb-2">{data.eventName}</p>
            <p className="text-sm text-gray-500 mb-3">
              {new Date(data.eventDate).toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
              {data.venue && ` • ${data.venue}`}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-purple-700">
                £{(data.priceInCents / 100).toFixed(2)}
              </span>
              <Badge className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <div>
          <h3 className="font-medium mb-3">Event Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Event:</dt>
              <dd className="font-medium">{data.eventName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Date:</dt>
              <dd>{new Date(data.eventDate).toLocaleDateString()}</dd>
            </div>
            {data.venue && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Venue:</dt>
                <dd>{data.venue}</dd>
              </div>
            )}
            {data.ticketType && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Type:</dt>
                <dd>{data.ticketType}</dd>
              </div>
            )}
          </dl>
        </div>
        
        <div>
          <h3 className="font-medium mb-3">Listing Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Price:</dt>
              <dd className="font-medium">£{(data.priceInCents / 100).toFixed(2)} per ticket</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Quantity:</dt>
              <dd>{data.quantity} ticket{data.quantity !== 1 ? 's' : ''}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Total Value:</dt>
              <dd className="font-medium">£{((data.priceInCents * data.quantity) / 100).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Files:</dt>
              <dd>{uploadedFiles.length} uploaded</dd>
            </div>
          </dl>
        </div>
      </div>
      
      {data.description && (
        <div className="max-w-2xl mx-auto">
          <h3 className="font-medium mb-3">Description</h3>
          <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">{data.description}</p>
        </div>
      )}
    </div>
  )
}