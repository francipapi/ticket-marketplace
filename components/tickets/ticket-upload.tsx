"use client"

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { extractTicketInfo } from '@/lib/utils/ocr-hybrid'
import { toast } from 'sonner'

interface ExtractedTicketInfo {
  eventName?: string
  eventDate?: string
  eventTime?: string
  venue?: string
  ticketType?: string
  orderReference?: string
  holderName?: string
  lastEntry?: string
  confidence: number
  hasPersonalInfo: boolean
  qrData?: string
  extractionMethod?: string
}

interface TicketUploadProps {
  onExtracted: (data: ExtractedTicketInfo) => void
  onFileUploaded?: (file: File) => void
}

export function TicketUpload({ onExtracted, onFileUploaded }: TicketUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)
  const [extractedData, setExtractedData] = useState<ExtractedTicketInfo | null>(null)
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    
    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    
    // Call onFileUploaded if provided
    if (onFileUploaded) {
      onFileUploaded(file)
    }
    
    // Process with OCR
    setIsProcessing(true)
    console.log('🔄 Starting OCR processing for file:', file.name)
    try {
      // Extract ticket information (includes preprocessing internally)
      console.log('📞 Calling extractTicketInfo...')
      const extracted = await extractTicketInfo(file)
      console.log('✅ OCR processing completed:', extracted)
      console.log('📊 Extracted fields:', {
        eventName: extracted.eventName,
        eventDate: extracted.eventDate,
        eventTime: extracted.eventTime,
        venue: extracted.venue,
        ticketType: extracted.ticketType,
        orderReference: extracted.orderReference,
        confidence: extracted.confidence
      })
      
      setConfidence(extracted.confidence)
      setExtractedData(extracted)
      
      console.log('🔄 Calling onExtracted callback with:', extracted)
      onExtracted(extracted)
      
      if (extracted.confidence > 70) {
        toast.success('Ticket details extracted successfully!')
      } else if (extracted.confidence > 40) {
        toast.warning('Some details extracted. Please verify the information.')
      } else {
        toast.error('Low confidence extraction. Please enter details manually.')
      }
      
      // Warn about personal information
      if (extracted.hasPersonalInfo) {
        toast.warning('Personal information detected. Please review before listing.')
      }
    } catch (error) {
      console.error('OCR processing failed:', error)
      toast.error('Failed to extract ticket details. Please enter manually.')
    } finally {
      setIsProcessing(false)
    }
  }, [onExtracted, onFileUploaded])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })
  
  const getConfidenceColor = (conf: number) => {
    if (conf > 80) return "text-green-600"
    if (conf > 60) return "text-yellow-600"
    return "text-red-600"
  }
  
  const getConfidenceIcon = (conf: number) => {
    if (conf > 80) return <CheckCircle className="w-4 h-4" />
    if (conf > 60) return <AlertCircle className="w-4 h-4" />
    return <AlertCircle className="w-4 h-4" />
  }
  
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive 
            ? "border-purple-500 bg-purple-50" 
            : "border-gray-300 hover:border-purple-400",
          isProcessing && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        
        {preview ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt="Ticket preview"
                className="max-h-64 mx-auto rounded shadow-lg"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                    <Loader2 className="animate-spin h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium">Processing ticket...</span>
                  </div>
                </div>
              )}
            </div>
            
            {confidence > 0 && (
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-center gap-2 mb-3">
                  {getConfidenceIcon(confidence)}
                  <span className="text-sm font-medium">Extraction Results</span>
                  {extractedData?.extractionMethod && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {extractedData.extractionMethod}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-600">Confidence: </span>
                  <span className={cn("font-semibold", getConfidenceColor(confidence))}>
                    {confidence.toFixed(0)}%
                  </span>
                </div>
                
                {extractedData && (
                  <div className="mt-3 text-left space-y-1">
                    {extractedData.eventName && (
                      <div className="text-sm">
                        <span className="text-gray-500">Event:</span> {extractedData.eventName}
                      </div>
                    )}
                    {extractedData.eventDate && (
                      <div className="text-sm">
                        <span className="text-gray-500">Date:</span> {extractedData.eventDate}
                      </div>
                    )}
                    {extractedData.venue && (
                      <div className="text-sm">
                        <span className="text-gray-500">Venue:</span> {extractedData.venue}
                      </div>
                    )}
                    {extractedData.hasPersonalInfo && (
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                        ⚠️ Personal information detected. Please review before listing.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-lg font-medium">
              {isDragActive 
                ? "Drop your ticket here" 
                : "Drag & drop your ticket"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Supports JPG, PNG, GIF up to 10MB
            </p>
          </div>
        )}
      </div>
      
      {/* Mobile Camera Option */}
      <div className="text-center md:hidden">
        <Button
          variant="outline"
          size="sm"
          disabled={isProcessing}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.capture = 'environment'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) onDrop([file])
            }
            input.click()
          }}
        >
          <Camera className="w-4 h-4 mr-2" />
          Take Photo
        </Button>
      </div>
      
      {/* OCR Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">🚀 Hybrid OCR System (2024):</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 🌐 **Browser Native Text Detection** (Chrome/Edge - fastest)</li>
          <li>• ⚡ **Quick Tesseract** (baseline recognition)</li>
          <li>• 🔬 **Advanced Tesseract** (with preprocessing)</li>
          <li>• 📐 **Template Matching** (mobile ticket patterns)</li>
          <li>• 🎯 **Best Result Selection** (automatic quality scoring)</li>
        </ul>
        <div className="mt-2 text-xs text-blue-600">
          System tries 4 different methods and selects the best result automatically
        </div>
      </div>
    </div>
  )
}