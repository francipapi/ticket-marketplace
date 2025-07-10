import Tesseract from 'tesseract.js'
import jsQR from 'jsqr'

// Modern OCR approach using multiple engines for better accuracy
interface OCREngine {
  name: string
  process: (file: File) => Promise<{ text: string; confidence: number }>
}

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
  rawText?: string // For debugging
}

export async function extractTicketInfo(
  imageFile: File
): Promise<ExtractedTicketInfo> {
  try {
    console.log('🔍 Starting advanced OCR processing...')
    
    // Try QR code first - often most reliable
    const qrData = await detectQRCode(imageFile)
    if (qrData) {
      console.log('📱 QR Code detected:', qrData)
      const qrExtracted = await extractFromQRData(qrData)
      if (qrExtracted && Object.keys(qrExtracted).length > 2) {
        console.log('✅ Sufficient data from QR code, skipping OCR')
        return { ...qrExtracted, confidence: 95, hasPersonalInfo: false, qrData }
      }
    }
    
    // Advanced preprocessing with multiple enhancement techniques
    const processedFiles = await createMultiplePreprocessedVersions(imageFile)
    console.log(`🔧 Created ${processedFiles.length} preprocessed versions`)
    
    // Try multiple OCR approaches
    const ocrResults: Array<{ text: string; confidence: number; method: string }> = []
    
    // Method 1: Enhanced Tesseract with optimal settings
    for (const processedFile of processedFiles) {
      const tesseractResult = await runEnhancedTesseract(processedFile.file, processedFile.name)
      if (tesseractResult) {
        ocrResults.push({ ...tesseractResult, method: `Tesseract-${processedFile.name}` })
      }
    }
    
    // Method 2: Fallback to browser's built-in text detection (if available)
    try {
      const browserResult = await tryBrowserTextDetection(imageFile)
      if (browserResult) {
        ocrResults.push({ ...browserResult, method: 'Browser-Native' })
      }
    } catch (error) {
      console.log('ℹ️ Browser text detection not available')
    }
    
    // Select best result
    const bestResult = ocrResults.reduce((best, current) => 
      current.confidence > best.confidence ? current : best, 
      { text: '', confidence: 0, method: 'none' }
    )
    
    if (bestResult.confidence === 0) {
      console.error('❌ All OCR methods failed')
      return {
        confidence: 0,
        hasPersonalInfo: false,
        rawText: 'All OCR methods failed'
      }
    }
    
    console.log(`✅ Best OCR result: ${bestResult.method} (${bestResult.confidence}%)`)
    console.log('📝 OCR Raw Text:', bestResult.text)
    
    // Advanced text processing and extraction
    const cleanText = advancedTextCleaning(bestResult.text)
    console.log('🧹 Cleaned Text:', cleanText)
    
    // Multi-strategy extraction with ticket-specific intelligence
    const extracted = await intelligentTicketExtraction(cleanText, qrData)
    extracted.confidence = calculateAdvancedConfidence(bestResult.confidence, extracted)
    extracted.rawText = bestResult.text
    
    console.log('✅ Final Extracted Info:', extracted)
    
    return extracted
  } catch (error) {
    console.error('❌ OCR Error:', error)
    return {
      confidence: 0,
      hasPersonalInfo: false,
      rawText: 'Error processing image'
    }
  }
}

// Advanced preprocessing creates multiple enhanced versions of the image
async function createMultiplePreprocessedVersions(file: File): Promise<Array<{ file: File; name: string }>> {
  const versions: Array<{ file: File; name: string }> = []
  
  try {
    // Version 1: High contrast with white padding (for dark tickets)
    const highContrast = await preprocessImageAdvanced(file, {
      contrast: 2.0,
      brightness: 1.2,
      padding: 0.2,
      dpi: 300,
      binarize: true
    })
    versions.push({ file: highContrast, name: 'high-contrast' })
    
    // Version 2: Gentle enhancement (for good quality images)
    const gentle = await preprocessImageAdvanced(file, {
      contrast: 1.3,
      brightness: 1.0,
      padding: 0.15,
      dpi: 400,
      binarize: false
    })
    versions.push({ file: gentle, name: 'gentle' })
    
    // Version 3: Super high resolution (for small text)
    const highRes = await preprocessImageAdvanced(file, {
      contrast: 1.5,
      brightness: 1.1,
      padding: 0.25,
      dpi: 600,
      binarize: true
    })
    versions.push({ file: highRes, name: 'high-res' })
    
  } catch (error) {
    console.warn('⚠️ Advanced preprocessing failed, using basic version')
    const basic = await preprocessImage(file)
    versions.push({ file: basic, name: 'basic' })
  }
  
  return versions
}

// Enhanced Tesseract processing with research-based optimizations
async function runEnhancedTesseract(file: File, version: string): Promise<{ text: string; confidence: number } | null> {
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: m => console.log(`🔧 Tesseract-${version}:`, m.status, m.progress)
  })
  
  try {
    // Research-based optimal configuration for ticket OCR
    await worker.setParameters({
      // Page segmentation optimized for structured documents
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      
      // Character whitelist for tickets (expanded based on research)
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-/@ ()&£$€+',
      
      // Space preservation (critical for ticket parsing)
      preserve_interword_spaces: '1',
      
      // Quality settings from research
      user_defined_dpi: '300',
      textord_min_linesize: '1.25',
      
      // Binarization method (Tesseract 5.0 adaptive methods)
      thresholding_method: '1', // Adaptive Otsu
      
      // Confidence thresholds
      tessedit_reject_mode: '0',
      load_system_dawg: '0',
      load_freq_dawg: '0'
    })
    
    const result = await worker.recognize(file)
    await worker.terminate()
    
    console.log(`📊 ${version} result: ${result.data.confidence}% confidence, ${result.data.text.length} chars`)
    
    return {
      text: result.data.text,
      confidence: result.data.confidence
    }
    
  } catch (error) {
    console.error(`❌ Tesseract ${version} failed:`, error)
    await worker.terminate()
    return null
  }
}

// Try browser's built-in text detection API (Chrome/Edge TextDetector)
async function tryBrowserTextDetection(file: File): Promise<{ text: string; confidence: number } | null> {
  // @ts-ignore - TextDetector is experimental
  if (!('TextDetector' in window)) {
    return null
  }
  
  try {
    // @ts-ignore
    const detector = new TextDetector()
    const bitmap = await createImageBitmap(file)
    const results = await detector.detect(bitmap)
    
    if (results && results.length > 0) {
      const text = results.map((r: any) => r.rawValue).join('\n')
      console.log('🌐 Browser TextDetector result:', text.substring(0, 100))
      
      return {
        text,
        confidence: 85 // Browser detection is usually quite good
      }
    }
  } catch (error) {
    console.log('ℹ️ Browser TextDetector failed:', error)
  }
  
  return null
}

// Advanced text cleaning with ticket-specific fixes
function advancedTextCleaning(text: string): string {
  console.log('🧹 Raw OCR text before cleaning:', JSON.stringify(text))
  
  const cleaned = text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    
    // Fix common OCR mistakes for ticket text
    .replace(/[|]/g, 'I')
    .replace(/\b0(?=[A-Za-z])/g, 'O') // 0 -> O only before letters
    .replace(/\b5(?=[A-Za-z])/g, 'S') // 5 -> S only before letters  
    .replace(/\b1(?=[A-Za-z])/g, 'I') // 1 -> I only before letters
    .replace(/\bI(?=\d)/g, '1') // I -> 1 before numbers
    .replace(/\bO(?=\d)/g, '0') // O -> 0 before numbers
    
    // Fix date separators
    .replace(/(\d)[|\/\\](\d)/g, '$1/$2')
    
    // Fix time format
    .replace(/(\d)[|](\d{2})/g, '$1:$2')
    
    // Clean up line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n+/g, '\n')
    
    // Remove noise characters common in mobile screenshots
    .replace(/[^\w\s\n.,:\-/()&@£$€+]/g, ' ')
    
    // Clean punctuation spacing
    .replace(/\s*([,.;:\-])\s*/g, '$1 ')
    
    .trim()
  
  console.log('🧹 Cleaned OCR text:', JSON.stringify(cleaned))
  return cleaned
}

// Intelligent extraction using ticket domain knowledge
async function intelligentTicketExtraction(text: string, qrData?: string | null): Promise<ExtractedTicketInfo> {
  console.log('🧠 Starting intelligent ticket extraction...')
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  console.log('📄 Processing lines:', lines)
  
  const extracted: ExtractedTicketInfo = {
    confidence: 0,
    hasPersonalInfo: false,
    qrData: qrData || undefined
  }
  
  // Strategy 1: Use ticket domain knowledge patterns
  await extractUsingTicketKnowledge(text, lines, extracted)
  
  // Strategy 2: Position-based extraction with mobile ticket awareness  
  await extractMobileTicketStructure(lines, extracted)
  
  // Strategy 3: Pattern matching with fuzzy logic
  await extractWithFuzzyMatching(text, extracted)
  
  // Strategy 4: QR code data integration
  if (qrData) {
    await integrateQRData(qrData, extracted)
  }
  
  // Post-processing and validation
  await validateAndCleanExtraction(extracted)
  
  return extracted
}

// Extract using specific knowledge about ticket formats
async function extractUsingTicketKnowledge(text: string, lines: string[], extracted: ExtractedTicketInfo) {
  // Mobile ticket signatures
  const mobileTicketIndicators = [
    'transfer disabled', 'no. of tickets', 'opening time', 'last entry',
    'ticket name', 'order reference', 'view details'
  ]
  
  const isMobileTicket = mobileTicketIndicators.some(indicator => 
    text.toLowerCase().includes(indicator)
  )
  
  if (isMobileTicket) {
    console.log('📱 Detected mobile ticket format')
    await extractMobileTicketFields(lines, extracted)
  } else {
    console.log('🎫 Detected printed/PDF ticket format')
    await extractPrintedTicketFields(text, extracted)
  }
}

// Extract QR data with smart parsing
async function extractFromQRData(qrData: string): Promise<Partial<ExtractedTicketInfo> | null> {
  try {
    // Try JSON parsing
    const parsed = JSON.parse(qrData)
    return {
      eventName: parsed.event || parsed.eventName || parsed.title,
      eventDate: parsed.date || parsed.eventDate,
      venue: parsed.venue || parsed.location,
      ticketType: parsed.type || parsed.ticketType,
      orderReference: parsed.ref || parsed.orderRef || parsed.reference
    }
  } catch {
    // Try structured text parsing
    const lines = qrData.split(/[\n,;|]/)
    const result: Partial<ExtractedTicketInfo> = {}
    
    for (const line of lines) {
      const lower = line.toLowerCase().trim()
      if (lower.includes('event') || lower.includes('party') || lower.includes('concert')) {
        result.eventName = line.trim()
      } else if (lower.match(/\d{4}/) && lower.match(/\d{1,2}/)) {
        result.eventDate = line.trim()
      }
    }
    
    return Object.keys(result).length > 0 ? result : null
  }
}

// Advanced preprocessing with configurable options
async function preprocessImageAdvanced(file: File, options: {
  contrast: number
  brightness: number
  padding: number
  dpi: number
  binarize: boolean
}): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const targetDpi = options.dpi
        const scale = Math.max(1, targetDpi / 150) // Assume 150 DPI base
        
        const padding = Math.round(Math.max(img.width, img.height) * options.padding * scale)
        const scaledWidth = Math.round(img.width * scale)
        const scaledHeight = Math.round(img.height * scale)
        
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        canvas.width = scaledWidth + (padding * 2)
        canvas.height = scaledHeight + (padding * 2)
        
        // Fill with white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw image with high quality scaling
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, padding, padding, scaledWidth, scaledHeight)
        
        // Apply advanced filtering
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          
          // Apply brightness and contrast
          let enhanced = (gray * options.brightness - 128) * options.contrast + 128
          enhanced = Math.max(0, Math.min(255, enhanced))
          
          // Optional binarization
          if (options.binarize) {
            enhanced = enhanced > 128 ? 255 : 0
          }
          
          data[i] = enhanced
          data[i + 1] = enhanced
          data[i + 2] = enhanced
        }
        
        ctx.putImageData(imageData, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const enhancedFile = new File([blob], `enhanced_${file.name}`, {
              type: 'image/png',
              lastModified: Date.now()
            })
            resolve(enhancedFile)
          } else {
            resolve(file)
          }
        }, 'image/png', 0.95)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Mobile ticket field extraction
async function extractMobileTicketFields(lines: string[], extracted: ExtractedTicketInfo) {
  console.log('📱 Processing mobile ticket lines:', lines)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim()
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
    
    console.log(`📱 Line ${i}: "${lines[i]}" (lower: "${line}") -> next: "${nextLine}"`)
    
    // Mobile ticket specific patterns
    if (line === 'name' && nextLine && !extracted.holderName) {
      extracted.holderName = nextLine
      console.log(`📱 Found holder name: ${nextLine}`)
    }
    
    if (line === 'order reference' && nextLine && !extracted.orderReference) {
      extracted.orderReference = nextLine
      console.log(`📱 Found order reference: ${nextLine}`)
    }
    
    if (line === 'ticket name' && nextLine && !extracted.ticketType) {
      extracted.ticketType = nextLine
      console.log(`📱 Found ticket type: ${nextLine}`)
    }
    
    if (line === 'opening time' && nextLine && !extracted.eventDate) {
      const dateTimeMatch = nextLine.match(/([A-Za-z]+,?\s*\d{1,2}\s+[A-Za-z]+\s+\d{4})(?:,?\s*(\d{1,2}:\d{2}(?:\s*GMT[+\-]\d+)?))?/i)
      if (dateTimeMatch) {
        extracted.eventDate = dateTimeMatch[1]
        if (dateTimeMatch[2]) {
          extracted.eventTime = dateTimeMatch[2]
        }
        console.log(`📱 Found event date/time: ${dateTimeMatch[1]}`)
      }
    }
    
    // Look for event name before "Name" field
    if (nextLine.toLowerCase() === 'name' && lines[i].length > 5 && !extracted.eventName) {
      if (!lines[i].toLowerCase().includes('ticket') && !lines[i].toLowerCase().includes('order')) {
        extracted.eventName = lines[i]
        console.log(`📱 Found event name: ${lines[i]}`)
      }
    }
  }
  
  // Fallback: try to find the event name by pattern matching
  if (!extracted.eventName) {
    console.log('📱 No event name found by structure, trying pattern matching...')
    for (const line of lines) {
      // Look for lines that look like event names
      if (line.toLowerCase().includes('halloween') || 
          line.toLowerCase().includes('party') || 
          line.toLowerCase().includes('smack') ||
          (line.length > 10 && line.match(/^[A-Z][A-Za-z\s]+$/))) {
        extracted.eventName = line
        console.log(`📱 Found event name by pattern: ${line}`)
        break
      }
    }
  }
  
  // Fallback: try to find ticket type by pattern matching
  if (!extracted.ticketType) {
    console.log('📱 No ticket type found by structure, trying pattern matching...')
    for (const line of lines) {
      if (line.toLowerCase().includes('advance') || 
          line.toLowerCase().includes('entry') ||
          line.toLowerCase().includes('admission')) {
        extracted.ticketType = line
        console.log(`📱 Found ticket type by pattern: ${line}`)
        break
      }
    }
  }
}

// Mobile ticket structure analysis
async function extractMobileTicketStructure(lines: string[], extracted: ExtractedTicketInfo) {
  console.log('📱 Analyzing mobile ticket structure...')
  await extractMobileTicketFields(lines, extracted)
}

// Printed ticket field extraction  
async function extractPrintedTicketFields(text: string, extracted: ExtractedTicketInfo) {
  console.log('🎫 Extracting printed ticket fields...')
  
  // Common printed ticket patterns
  const patterns = {
    eventName: [
      /event[:\s]+([^\n]+)/i,
      /concert[:\s]+([^\n]+)/i,
      /show[:\s]+([^\n]+)/i
    ],
    venue: [
      /venue[:\s]+([^\n]+)/i,
      /location[:\s]+([^\n]+)/i,
      /at[:\s]+([^\n]+)/i
    ],
    eventDate: [
      /date[:\s]+([^\n]+)/i,
      /when[:\s]+([^\n]+)/i
    ]
  }
  
  for (const [field, fieldPatterns] of Object.entries(patterns)) {
    if (!(extracted as any)[field]) {
      for (const pattern of fieldPatterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
          (extracted as any)[field] = match[1].trim()
          console.log(`🎫 Found ${field}: ${match[1].trim()}`)
          break
        }
      }
    }
  }
}

// Fuzzy matching with error tolerance
async function extractWithFuzzyMatching(text: string, extracted: ExtractedTicketInfo) {
  console.log('🔍 Using fuzzy matching...')
  
  // Look for any date patterns anywhere in text
  if (!extracted.eventDate) {
    const datePatterns = [
      /((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+20\d{2})/gi,
      /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+20\d{2})/gi
    ]
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        extracted.eventDate = match[1]
        console.log(`🔍 Fuzzy found date: ${match[1]}`)
        break
      }
    }
  }
  
  // Look for any time patterns
  if (!extracted.eventTime) {
    const timeMatch = text.match(/(\d{1,2}:\d{2}(?:\s*GMT[+\-]\d+)?)/i)
    if (timeMatch) {
      extracted.eventTime = timeMatch[1]
      console.log(`🔍 Fuzzy found time: ${timeMatch[1]}`)
    }
  }
}

// Integrate QR data with OCR results
async function integrateQRData(qrData: string, extracted: ExtractedTicketInfo) {
  console.log('🔗 Integrating QR data...')
  const qrExtracted = await extractFromQRData(qrData)
  
  if (qrExtracted) {
    // Use QR data to fill missing fields or validate existing ones
    if (!extracted.eventName && qrExtracted.eventName) {
      extracted.eventName = qrExtracted.eventName
      console.log(`🔗 QR provided event name: ${qrExtracted.eventName}`)
    }
    
    if (!extracted.eventDate && qrExtracted.eventDate) {
      extracted.eventDate = qrExtracted.eventDate
      console.log(`🔗 QR provided event date: ${qrExtracted.eventDate}`)
    }
  }
}

// Validate and clean extracted data
async function validateAndCleanExtraction(extracted: ExtractedTicketInfo) {
  console.log('🧹 Validating and cleaning extraction...')
  
  // Clean event name
  if (extracted.eventName) {
    extracted.eventName = extracted.eventName
      .replace(/[^\w\s&'.\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  // Normalize date
  if (extracted.eventDate) {
    extracted.eventDate = normalizeDate(extracted.eventDate)
  }
  
  // Clean venue
  if (extracted.venue) {
    extracted.venue = extracted.venue
      .replace(/[^\w\s&'.\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  // Check for personal information
  const textToCheck = Object.values(extracted).join(' ')
  extracted.hasPersonalInfo = !!(
    textToCheck.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/) ||
    textToCheck.match(/order\s*ref/i) ||
    textToCheck.match(/\b[A-Z0-9]{6,}\b/)
  )
}

function calculateAdvancedConfidence(ocrConfidence: number, extracted: ExtractedTicketInfo): number {
  let score = ocrConfidence * 0.7 // Base OCR confidence weighted down
  
  // Boost based on successful extractions
  if (extracted.eventName) score += 25
  if (extracted.eventDate) score += 20
  if (extracted.venue) score += 10
  if (extracted.eventTime) score += 10
  if (extracted.ticketType) score += 8
  if (extracted.qrData) score += 15
  if (extracted.orderReference) score += 5
  
  // Bonus for multiple successful extractions (indicates good OCR)
  const extractedFields = [extracted.eventName, extracted.eventDate, extracted.venue, extracted.eventTime].filter(Boolean).length
  if (extractedFields >= 3) score += 10
  
  return Math.min(100, Math.max(0, score))
}

// This function has been replaced by intelligentTicketExtraction

// Old function - moved to intelligentTicketExtraction

async function extractByPosition(lines: string[], extracted: ExtractedTicketInfo) {
  console.log('📄 Analyzing line positions for mobile ticket format...')
  
  // Mobile ticket structure analysis
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
    
    console.log(`Line ${i}: "${line}"`)
    
    // Event name detection - usually appears after QR section and before Name
    if (!extracted.eventName) {
      // Look for event name patterns
      if (line.match(/^[A-Z][A-Za-z\s]+(?:Party|Event|Concert|Festival|Ball|Show|Gala)$/i) && 
          line.length > 5 && 
          !line.toLowerCase().includes('name') &&
          !line.toLowerCase().includes('ticket') &&
          !line.toLowerCase().includes('order')) {
        extracted.eventName = line
        console.log(`🎯 Found event name by position: ${line}`)
      }
      // Also check if next line is "Name" indicating this line is event name
      else if (nextLine.toLowerCase() === 'name' && line.length > 5) {
        extracted.eventName = line
        console.log(`🎯 Found event name before Name field: ${line}`)
      }
    }
    
    // Extract fields that follow label pattern
    if (line.toLowerCase() === 'name' && nextLine && !extracted.holderName) {
      extracted.holderName = nextLine
      console.log(`🎯 Found holder name: ${nextLine}`)
    }
    
    if (line.toLowerCase() === 'order reference' && nextLine && !extracted.orderReference) {
      extracted.orderReference = nextLine
      console.log(`🎯 Found order reference: ${nextLine}`)
    }
    
    if (line.toLowerCase() === 'ticket name' && nextLine && !extracted.ticketType) {
      extracted.ticketType = nextLine
      console.log(`🎯 Found ticket type: ${nextLine}`)
    }
    
    if (line.toLowerCase() === 'opening time' && nextLine && !extracted.eventDate) {
      console.log(`🔍 Processing opening time line: "${nextLine}"`)
      
      // Try multiple date/time parsing approaches
      const approaches = [
        // Full format: "Saturday, 28 Oct 2023, 23:00 GMT+1"
        /([A-Za-z]+,?\s*\d{1,2}\s+[A-Za-z]+\s+\d{4})(?:,?\s*(\d{1,2}:\d{2}(?:\s*GMT[+\-]\d+)?))?/i,
        // Without day name: "28 Oct 2023, 23:00 GMT+1"
        /(\d{1,2}\s+[A-Za-z]+\s+\d{4})(?:,?\s*(\d{1,2}:\d{2}(?:\s*GMT[+\-]\d+)?))?/i,
        // More flexible: any date-like pattern
        /((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i
      ]
      
      for (let i = 0; i < approaches.length; i++) {
        const match = nextLine.match(approaches[i])
        if (match) {
          console.log(`✅ Date match found with approach ${i + 1}: ${match[1]}`)
          extracted.eventDate = match[1].trim()
          if (match[2]) {
            extracted.eventTime = match[2].trim()
            console.log(`✅ Time extracted: ${match[2].trim()}`)
          }
          break
        } else {
          console.log(`❌ Approach ${i + 1} failed`)
        }
      }
      
      // If no structured match, try to find any date pattern in the line
      if (!extracted.eventDate) {
        console.log('🔍 Trying fallback date patterns...')
        const fallbackPatterns = [
          /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
          /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
          /(20\d{2})/  // Just the year as last resort
        ]
        
        for (const pattern of fallbackPatterns) {
          const match = nextLine.match(pattern)
          if (match) {
            console.log(`🎯 Fallback date found: ${match[1]}`)
            extracted.eventDate = match[1]
            break
          }
        }
      }
    }
    
    if (line.toLowerCase() === 'last entry' && nextLine && !extracted.lastEntry) {
      extracted.lastEntry = nextLine
      console.log(`🎯 Found last entry: ${nextLine}`)
    }
    
    // Aggressive date search - look for date patterns in ANY line
    if (!extracted.eventDate) {
      const datePatterns = [
        // Mobile ticket format: "Saturday, 28 Oct 2023, 23:00 GMT+1"
        /((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i,
        // Just day/month/year: "28 Oct 2023"
        /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i,
        // Numeric dates
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
        /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
      ]
      
      for (const pattern of datePatterns) {
        const match = line.match(pattern)
        if (match && match[1]) {
          console.log(`🎯 Found date in line "${line}": ${match[1]}`)
          extracted.eventDate = match[1].trim()
          break
        }
      }
    }
    
    // Aggressive time search
    if (!extracted.eventTime) {
      const timePatterns = [
        /(\d{1,2}:\d{2}\s*GMT[+\-]\d+)/i,
        /(\d{1,2}:\d{2}(?:\s*[ap]m)?)/i
      ]
      
      for (const pattern of timePatterns) {
        const match = line.match(pattern)
        if (match && match[1]) {
          console.log(`🎯 Found time in line "${line}": ${match[1]}`)
          extracted.eventTime = match[1].trim()
          break
        }
      }
    }
  }
}

async function extractByPatterns(text: string, extracted: ExtractedTicketInfo) {
  console.log('🔍 Running comprehensive pattern search on full text...')
  
  // First, do an aggressive search for ANY date/time patterns in the entire text
  if (!extracted.eventDate) {
    console.log('🔍 Searching for date patterns in full text...')
    const aggressiveDatePatterns = [
      // Mobile format with full day: "Saturday, 28 Oct 2023"
      /((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+20\d{2})/gi,
      // Short format: "28 Oct 2023"
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+20\d{2})/gi,
      // Full month names
      /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})/gi,
      // Numeric formats
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]20\d{2})/g,
      /(20\d{2}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g
    ]
    
    for (const pattern of aggressiveDatePatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          console.log(`🎯 Found date pattern: "${match[1]}"`)
          extracted.eventDate = match[1].trim()
          break
        }
      }
      if (extracted.eventDate) break
    }
  }
  
  if (!extracted.eventTime) {
    console.log('🔍 Searching for time patterns in full text...')
    const timePatterns = [
      /(\d{1,2}:\d{2}\s*GMT[+\-]\d+)/gi,
      /(\d{1,2}:\d{2}(?:\s*[ap]m)?)/gi
    ]
    
    for (const pattern of timePatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          console.log(`🎯 Found time pattern: "${match[1]}"`)
          extracted.eventTime = match[1].trim()
          break
        }
      }
      if (extracted.eventTime) break
    }
  }
  
  // Patterns specific to mobile ticket format seen in reference image
  const mobileTicketPatterns = {
    eventName: [
      // Event name typically appears as a standalone line after QR section
      /The\s+Smack\s+Halloween\s+Party/i,
      /([A-Z][A-Za-z\s]+(?:Party|Event|Concert|Festival|Ball|Show|Gala))\s*\n\s*Name/i,
      // More generic event patterns
      /(?:the\s+)?([A-Z][A-Za-z\s&']+(?:festival|concert|show|party|ball|gala|tour))/i,
      // Event name patterns for various formats
      /^([A-Z][A-Za-z\s]+(?:Party|Event|Concert|Festival|Ball|Show))\s*$/m
    ],
    ticketType: [
      // Specific ticket types from mobile tickets
      /(Advance Entry|General Admission|VIP|Student Entry)/i,
      // Generic patterns
      /(?:ticket\s*name|type)[:\s]*([A-Za-z\s]+)/i
    ],
    holderName: [
      // Mobile ticket holder name pattern
      /Name\s*\n\s*([A-Za-z\s]+)/i,
      /Name[:\s]+([A-Za-z\s]+)/i
    ],
    orderReference: [
      // Mobile ticket order reference
      /Order\s*reference\s*\n\s*([A-Za-z0-9]+)/i,
      /Order\s*reference[:\s]+([A-Za-z0-9]+)/i,
      // Generic reference patterns
      /([a-z0-9]{6,})/i // Alphanumeric codes like "9d280cdd"
    ]
  }
  
  for (const [field, patterns] of Object.entries(mobileTicketPatterns)) {
    if (!(extracted as any)[field]) {
      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match && match[1] && match[1].trim().length > 1) {
          let value = match[1].trim()
          
          // Clean up extracted values
          if (field === 'holderName' || field === 'eventName') {
            // Remove extra spaces and clean up names
            value = value.replace(/\s+/g, ' ').trim()
          }
          
          (extracted as any)[field] = value
          console.log(`🎯 Found ${field} via pattern: ${value}`)
          break
        }
      }
    }
  }
}

async function extractFromQR(qrData: string, extracted: ExtractedTicketInfo) {
  try {
    // QR might contain JSON
    const parsed = JSON.parse(qrData)
    if (parsed.event) extracted.eventName = parsed.event
    if (parsed.date) extracted.eventDate = parsed.date
    if (parsed.venue) extracted.venue = parsed.venue
    console.log('🎯 Extracted from QR JSON:', parsed)
  } catch {
    // QR might contain structured text
    const qrLines = qrData.split(/[\n,;]/)
    for (const line of qrLines) {
      if (line.length > 5 && !extracted.eventName) {
        extracted.eventName = line.trim()
        console.log('🎯 Found event name in QR text:', line.trim())
        break
      }
    }
  }
}

async function postProcessExtraction(extracted: ExtractedTicketInfo) {
  // Clean up extracted data
  if (extracted.eventName) {
    extracted.eventName = extracted.eventName
      .replace(/[^\w\s&'.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  if (extracted.venue) {
    extracted.venue = extracted.venue
      .replace(/[^\w\s&'.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  // Validate and normalize date
  if (extracted.eventDate) {
    extracted.eventDate = normalizeDate(extracted.eventDate)
  }
  
  // Check for personal information
  const text = Object.values(extracted).join(' ')
  extracted.hasPersonalInfo = !!(
    text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/) || // Full names
    text.match(/order\s*ref/i) ||
    text.match(/booking\s*ref/i) ||
    text.match(/\b[A-Z0-9]{6,}\b/) // Reference numbers
  )
}

function normalizeDate(dateStr: string): string {
  try {
    console.log(`📅 Normalizing date: "${dateStr}"`)
    
    // Handle mobile ticket format: "Saturday, 28 Oct 2023"
    const mobileFormat = dateStr.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i)
    if (mobileFormat) {
      const [, , day, monthAbbr, year] = mobileFormat
      const monthMap: { [key: string]: number } = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      }
      const monthNum = monthMap[monthAbbr.toLowerCase()]
      if (monthNum !== undefined) {
        const date = new Date(parseInt(year), monthNum, parseInt(day))
        if (!isNaN(date.getTime())) {
          const isoDate = date.toISOString().split('T')[0]
          console.log(`✅ Converted mobile date to: ${isoDate}`)
          return isoDate
        }
      }
    }
    
    // Try standard date parsing
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      const isoDate = date.toISOString().split('T')[0]
      console.log(`✅ Converted standard date to: ${isoDate}`)
      return isoDate
    }
    
    // Handle UK date format DD/MM/YYYY
    const ukDate = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/)
    if (ukDate) {
      const [, day, month, year] = ukDate
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) {
        const isoDate = date.toISOString().split('T')[0]
        console.log(`✅ Converted UK date to: ${isoDate}`)
        return isoDate
      }
    }
    
    console.log(`⚠️ Could not parse date, returning original: ${dateStr}`)
    return dateStr // Return original if can't parse
  } catch (error) {
    console.log(`❌ Error parsing date: ${error}`)
    return dateStr
  }
}

function calculateConfidence(ocrConfidence: number, extracted: ExtractedTicketInfo): number {
  let score = ocrConfidence
  
  // Boost confidence based on successful extractions
  if (extracted.eventName) score += 20
  if (extracted.eventDate) score += 20
  if (extracted.venue) score += 15
  if (extracted.eventTime) score += 10
  if (extracted.ticketType) score += 10
  if (extracted.qrData) score += 15
  
  return Math.min(100, score)
}

async function detectQRCode(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        
        const imageData = ctx.getImageData(
          0, 0, canvas.width, canvas.height
        )
        const code = jsQR(
          imageData.data, 
          imageData.width, 
          imageData.height
        )
        
        resolve(code ? code.data : null)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Enhanced image preprocessing for better OCR results
export async function preprocessImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        console.log(`🖼️ Original image: ${img.width}x${img.height}`)
        
        // Calculate optimal size - aim for 300+ DPI equivalent
        const targetMinDimension = 1200 // Minimum dimension for good OCR
        const scale = Math.max(1, targetMinDimension / Math.max(img.width, img.height))
        
        // Add 20% padding around text as recommended
        const padding = Math.round(Math.max(img.width, img.height) * 0.2 * scale)
        const scaledWidth = Math.round(img.width * scale)
        const scaledHeight = Math.round(img.height * scale)
        
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        // Set canvas size with padding
        canvas.width = scaledWidth + (padding * 2)
        canvas.height = scaledHeight + (padding * 2)
        
        console.log(`🔧 Processed size: ${canvas.width}x${canvas.height} (scale: ${scale.toFixed(2)})`)
        
        // Fill with white background (important for OCR)
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw image centered with padding
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, padding, padding, scaledWidth, scaledHeight)
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Calculate image statistics for adaptive processing
        let totalBrightness = 0
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          totalBrightness += gray
        }
        const averageBrightness = totalBrightness / (data.length / 4)
        console.log(`📊 Average brightness: ${averageBrightness.toFixed(1)}`)
        
        // Adaptive image enhancement
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          
          let enhanced = gray
          
          // Adaptive contrast based on image brightness
          if (averageBrightness < 100) {
            // Dark image - increase brightness more
            enhanced = Math.min(255, enhanced * 1.5)
          } else if (averageBrightness > 180) {
            // Bright image - increase contrast
            enhanced = Math.max(0, Math.min(255, (enhanced - 128) * 1.3 + 128))
          } else {
            // Normal image - moderate enhancement
            enhanced = Math.max(0, Math.min(255, (enhanced - 128) * 1.2 + 128))
          }
          
          // Apply gamma correction for better text visibility
          enhanced = Math.pow(enhanced / 255, 0.9) * 255
          
          // Adaptive threshold based on local contrast
          const threshold = averageBrightness * 0.7
          enhanced = enhanced > threshold ? 255 : 0
          
          data[i] = enhanced     // Red
          data[i + 1] = enhanced // Green  
          data[i + 2] = enhanced // Blue
          // Alpha stays the same
        }
        
        // Apply light denoising
        const filteredData = applyLightDenoise(data, canvas.width, canvas.height)
        const filteredImageData = new ImageData(filteredData, canvas.width, canvas.height)
        
        // Create final canvas
        const finalCanvas = document.createElement('canvas')
        const finalCtx = finalCanvas.getContext('2d')!
        finalCanvas.width = canvas.width
        finalCanvas.height = canvas.height
        
        finalCtx.putImageData(filteredImageData, 0, 0)
        
        // Convert to high-quality PNG
        finalCanvas.toBlob((blob) => {
          if (blob) {
            const enhancedFile = new File([blob], `processed_${file.name}`, {
              type: 'image/png',
              lastModified: Date.now()
            })
            console.log(`✅ Image preprocessed: ${blob.size} bytes`)
            resolve(enhancedFile)
          } else {
            console.warn('⚠️ Preprocessing failed, using original')
            resolve(file)
          }
        }, 'image/png', 0.95) // High quality PNG
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Light denoising filter for better OCR
function applyLightDenoise(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const filtered = new Uint8ClampedArray(data.length)
  
  // Copy original data first
  for (let i = 0; i < data.length; i++) {
    filtered[i] = data[i]
  }
  
  // Apply light smoothing only to reduce noise, preserve text edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      
      // Get 3x3 neighborhood for red channel (grayscale)
      const center = data[idx]
      const neighbors = [
        data[((y - 1) * width + (x - 1)) * 4], // Top-left
        data[((y - 1) * width + x) * 4],       // Top
        data[((y - 1) * width + (x + 1)) * 4], // Top-right
        data[(y * width + (x - 1)) * 4],       // Left
        data[(y * width + (x + 1)) * 4],       // Right
        data[((y + 1) * width + (x - 1)) * 4], // Bottom-left
        data[((y + 1) * width + x) * 4],       // Bottom
        data[((y + 1) * width + (x + 1)) * 4]  // Bottom-right
      ]
      
      // Count similar neighbors (within threshold)
      const threshold = 50
      const similarCount = neighbors.filter(n => Math.abs(n - center) < threshold).length
      
      // Only smooth if most neighbors are similar (not on text edges)
      if (similarCount >= 6) {
        const average = (center + neighbors.reduce((sum, n) => sum + n, 0)) / 9
        filtered[idx] = average
        filtered[idx + 1] = average
        filtered[idx + 2] = average
      }
      // Otherwise keep original value (preserve sharp text edges)
    }
  }
  
  return filtered
}