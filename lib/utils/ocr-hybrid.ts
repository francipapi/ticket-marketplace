import Tesseract from 'tesseract.js'

// Hybrid OCR system combining multiple approaches for maximum reliability
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
  rawText?: string
  extractionMethod?: string
}

export async function extractTicketInfo(imageFile: File): Promise<ExtractedTicketInfo> {
  console.log('🚀 Starting hybrid OCR system...')
  
  try {
    // Strategy 1: Try Browser Native Text Detection API first (fastest, Chrome/Edge)
    const browserResult = await tryBrowserTextDetection(imageFile)
    if (browserResult && browserResult.confidence > 70) {
      console.log('✅ Browser Text Detection succeeded with high confidence')
      return browserResult
    }

    // Strategy 2: Quick and dirty simple Tesseract (baseline)
    const quickResult = await tryQuickTesseract(imageFile)
    if (quickResult && quickResult.confidence > 80) {
      console.log('✅ Quick Tesseract succeeded with high confidence')
      return quickResult
    }

    // Strategy 3: Advanced preprocessing + optimized Tesseract
    const advancedResult = await tryAdvancedTesseract(imageFile)
    if (advancedResult && advancedResult.confidence > 60) {
      console.log('✅ Advanced Tesseract succeeded')
      return advancedResult
    }

    // Strategy 4: Template matching for known ticket formats
    const templateResult = await tryTemplateMatching(imageFile)
    if (templateResult && templateResult.confidence > 50) {
      console.log('✅ Template matching succeeded')
      return templateResult
    }

    // Strategy 5: Return the best result we got
    const results = [browserResult, quickResult, advancedResult, templateResult].filter(Boolean)
    if (results.length > 0) {
      const bestResult = results.reduce((best, current) => 
        (current?.confidence || 0) > (best?.confidence || 0) ? current : best
      )
      console.log(`🏆 Returning best result: ${bestResult?.extractionMethod} (${bestResult?.confidence}%)`)
      return bestResult!
    }

    // Fallback: return minimal data
    return {
      confidence: 0,
      hasPersonalInfo: false,
      rawText: 'All OCR methods failed',
      extractionMethod: 'none'
    }

  } catch (error) {
    console.error('❌ Hybrid OCR system failed:', error)
    return {
      confidence: 0,
      hasPersonalInfo: false,
      rawText: 'OCR processing error',
      extractionMethod: 'error'
    }
  }
}

// Strategy 1: Browser Native Text Detection (Chrome/Edge Experimental API)
async function tryBrowserTextDetection(file: File): Promise<ExtractedTicketInfo | null> {
  try {
    // @ts-ignore - Experimental API
    if (!('TextDetector' in window)) {
      console.log('ℹ️ Browser Text Detection not available')
      return null
    }

    console.log('🌐 Trying Browser Text Detection...')
    
    // @ts-ignore
    const detector = new TextDetector()
    const bitmap = await createImageBitmap(file)
    const results = await detector.detect(bitmap)
    
    if (results && results.length > 0) {
      const text = results.map((r: any) => r.rawValue).join('\n')
      console.log('🌐 Browser detection result:', text.substring(0, 200))
      
      const extracted = await extractStructuredData(text)
      extracted.confidence = 85 // Browser detection is usually quite good
      extracted.extractionMethod = 'browser-native'
      extracted.rawText = text
      
      return extracted
    }
  } catch (error) {
    console.log('🌐 Browser Text Detection failed:', error)
  }
  
  return null
}

// Strategy 2: Quick Tesseract with minimal preprocessing
async function tryQuickTesseract(file: File): Promise<ExtractedTicketInfo | null> {
  try {
    console.log('⚡ Trying Quick Tesseract...')
    
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => console.log(`⚡ Quick:`, m.status, m.progress?.toFixed(0) + '%')
    })
    
    // Simple, fast configuration
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
    })
    
    const result = await worker.recognize(file)
    await worker.terminate()
    
    console.log(`⚡ Quick result: ${result.data.confidence.toFixed(1)}% confidence`)
    
    if (result.data.confidence > 30) {
      const extracted = await extractStructuredData(result.data.text)
      extracted.confidence = result.data.confidence
      extracted.extractionMethod = 'tesseract-quick'
      extracted.rawText = result.data.text
      
      return extracted
    }
    
  } catch (error) {
    console.error('⚡ Quick Tesseract failed:', error)
  }
  
  return null
}

// Strategy 3: Advanced Tesseract with preprocessing
async function tryAdvancedTesseract(file: File): Promise<ExtractedTicketInfo | null> {
  try {
    console.log('🔬 Trying Advanced Tesseract with preprocessing...')
    
    // Create multiple preprocessed versions
    const versions = await createPreprocessedVersions(file)
    console.log(`🔧 Created ${versions.length} preprocessed versions`)
    
    const results = []
    
    for (const version of versions) {
      try {
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: m => console.log(`🔬 ${version.name}:`, m.status, m.progress?.toFixed(0) + '%')
        })
        
        // Advanced configuration based on 2024 research
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-/()@ £$€+GMT',
          preserve_interword_spaces: '1',
          user_defined_dpi: '300'
        })
        
        const result = await worker.recognize(version.blob)
        await worker.terminate()
        
        results.push({
          text: result.data.text,
          confidence: result.data.confidence,
          version: version.name
        })
        
        console.log(`🔬 ${version.name}: ${result.data.confidence.toFixed(1)}%`)
        
      } catch (error) {
        console.warn(`🔬 ${version.name} failed:`, error)
      }
    }
    
    if (results.length > 0) {
      // Select best result
      const bestResult = results.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      )
      
      console.log(`🏆 Best advanced result: ${bestResult.version} (${bestResult.confidence.toFixed(1)}%)`)
      
      const extracted = await extractStructuredData(bestResult.text)
      extracted.confidence = bestResult.confidence
      extracted.extractionMethod = `tesseract-advanced-${bestResult.version}`
      extracted.rawText = bestResult.text
      
      return extracted
    }
    
  } catch (error) {
    console.error('🔬 Advanced Tesseract failed:', error)
  }
  
  return null
}

// Strategy 4: Template matching for known ticket formats
async function tryTemplateMatching(file: File): Promise<ExtractedTicketInfo | null> {
  try {
    console.log('📐 Trying template matching for mobile tickets...')
    
    // Use the quick Tesseract result for template matching
    const worker = await Tesseract.createWorker('eng', 1)
    
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.RAW_LINE, // Line by line for template matching
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
    })
    
    const result = await worker.recognize(file)
    await worker.terminate()
    
    const text = result.data.text
    console.log('📐 Template matching on text:', text.substring(0, 200))
    
    // Template-specific extraction for mobile tickets
    const extracted = await extractWithMobileTemplate(text)
    
    if (extracted && (extracted.eventName || extracted.eventDate)) {
      extracted.confidence = Math.min(result.data.confidence + 10, 90) // Boost confidence for template match
      extracted.extractionMethod = 'template-matching'
      extracted.rawText = text
      
      console.log('📐 Template matching found data:', {
        eventName: extracted.eventName,
        eventDate: extracted.eventDate,
        ticketType: extracted.ticketType
      })
      
      return extracted
    }
    
  } catch (error) {
    console.error('📐 Template matching failed:', error)
  }
  
  return null
}

// Create preprocessed versions with different optimizations
async function createPreprocessedVersions(file: File): Promise<Array<{ blob: Blob; name: string }>> {
  const versions: Array<{ blob: Blob; name: string }> = []
  
  try {
    // Original file
    versions.push({ blob: file, name: 'original' })
    
    // High contrast version
    const highContrast = await applySimplePreprocessing(file, {
      contrast: 2.0,
      brightness: 1.1,
      grayscale: true
    })
    if (highContrast) versions.push({ blob: highContrast, name: 'high-contrast' })
    
    // Bright version for dark tickets
    const bright = await applySimplePreprocessing(file, {
      contrast: 1.5,
      brightness: 1.3,
      grayscale: true
    })
    if (bright) versions.push({ blob: bright, name: 'bright' })
    
  } catch (error) {
    console.warn('⚠️ Preprocessing failed, using original:', error)
  }
  
  return versions.length > 0 ? versions : [{ blob: file, name: 'original-fallback' }]
}

// Simple preprocessing using canvas
async function applySimplePreprocessing(
  file: File, 
  options: { contrast: number; brightness: number; grayscale: boolean }
): Promise<Blob | null> {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    const img = await loadImage(file)
    canvas.width = img.width
    canvas.height = img.height
    
    // Apply filters using canvas
    ctx.filter = `contrast(${options.contrast}) brightness(${options.brightness}) ${options.grayscale ? 'grayscale(100%)' : ''}`
    ctx.drawImage(img, 0, 0)
    
    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png')
    })
    
  } catch (error) {
    console.warn('Simple preprocessing failed:', error)
    return null
  }
}

// Load image from file
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// Extract structured data using multiple strategies
async function extractStructuredData(text: string): Promise<ExtractedTicketInfo> {
  const extracted: ExtractedTicketInfo = {
    confidence: 0,
    hasPersonalInfo: false
  }
  
  // Strategy 1: Mobile ticket structured extraction
  await extractMobileTicketStructure(text, extracted)
  
  // Strategy 2: Pattern-based extraction
  await extractWithPatterns(text, extracted)
  
  // Strategy 3: Keyword proximity extraction
  await extractWithKeywordProximity(text, extracted)
  
  // Check for personal information
  extracted.hasPersonalInfo = containsPersonalInfo(text)
  
  return extracted
}

// Mobile ticket template extraction
async function extractWithMobileTemplate(text: string): Promise<ExtractedTicketInfo | null> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  const extracted: ExtractedTicketInfo = {
    confidence: 0,
    hasPersonalInfo: false
  }
  
  // Mobile ticket patterns - looking for specific sequences
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    const nextLine = lines[i + 1] || ''
    
    // Mobile ticket specific patterns
    if (line.includes('transfer disabled') || line.includes('no. of tickets')) {
      // This looks like a mobile ticket, boost confidence
      extracted.confidence = 60
    }
    
    // Look for event name before "Name" field (mobile ticket pattern)
    if (nextLine.toLowerCase().includes('name') && lines[i].length > 5) {
      if (!lines[i].toLowerCase().includes('ticket') && 
          !lines[i].toLowerCase().includes('order') &&
          !lines[i].toLowerCase().includes('transfer')) {
        extracted.eventName = lines[i]
        console.log('📐 Template found event name:', lines[i])
      }
    }
    
    // Opening time pattern
    if (line.includes('opening time') && nextLine) {
      const dateMatch = nextLine.match(/([A-Za-z]+,?\s*\d{1,2}\s+[A-Za-z]+\s+\d{4})/)
      if (dateMatch) {
        extracted.eventDate = dateMatch[1]
        console.log('📐 Template found date:', dateMatch[1])
      }
    }
    
    // Ticket type patterns
    if (line.includes('ticket name') && nextLine) {
      extracted.ticketType = nextLine
      console.log('📐 Template found ticket type:', nextLine)
    }
  }
  
  return extracted
}

// Extract mobile ticket structure
async function extractMobileTicketStructure(text: string, extracted: ExtractedTicketInfo) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    const nextLine = lines[i + 1] || ''
    const originalLine = lines[i]
    
    // Field-value pairs
    if (line === 'name' && nextLine) {
      extracted.holderName = nextLine
    }
    
    if ((line === 'order reference' || line === 'order ref') && nextLine) {
      extracted.orderReference = nextLine
    }
    
    if ((line === 'ticket name' || line === 'ticket type') && nextLine) {
      extracted.ticketType = nextLine
    }
    
    if ((line === 'opening time' || line === 'event date') && nextLine) {
      const dateMatch = nextLine.match(/([A-Za-z]+,?\s*\d{1,2}\s+[A-Za-z]+\s+\d{4})/)
      if (dateMatch) {
        extracted.eventDate = dateMatch[1]
      }
    }
    
    // Event name before Name field
    if (nextLine.toLowerCase() === 'name' && originalLine.length > 5) {
      if (!originalLine.toLowerCase().includes('ticket') && 
          !originalLine.toLowerCase().includes('order')) {
        extracted.eventName = originalLine
      }
    }
  }
}

// Pattern-based extraction
async function extractWithPatterns(text: string, extracted: ExtractedTicketInfo) {
  // Date patterns
  if (!extracted.eventDate) {
    const datePatterns = [
      /((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i,
      /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i
    ]
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        extracted.eventDate = match[1]
        break
      }
    }
  }
  
  // Event name patterns
  if (!extracted.eventName) {
    const eventPatterns = [
      /([A-Z][A-Za-z\s]+Halloween[A-Za-z\s]*Party)/i,
      /([A-Z][A-Za-z\s]+(?:Party|Event|Concert|Festival|Ball|Show))/i
    ]
    
    for (const pattern of eventPatterns) {
      const match = text.match(pattern)
      if (match) {
        extracted.eventName = match[1].trim()
        break
      }
    }
  }
}

// Keyword proximity extraction
async function extractWithKeywordProximity(text: string, extracted: ExtractedTicketInfo) {
  const words = text.split(/\s+/)
  
  // Look for words near "Halloween" or "Party"
  if (!extracted.eventName) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase()
      if (word.includes('halloween') || word.includes('smack')) {
        // Take surrounding words to form event name
        const start = Math.max(0, i - 3)
        const end = Math.min(words.length, i + 4)
        const eventName = words.slice(start, end).join(' ')
        
        // Clean up the event name
        const match = eventName.match(/([A-Z][A-Za-z\s]*(?:Halloween|Smack)[A-Za-z\s]*(?:Party|Event)?)/i)
        if (match) {
          extracted.eventName = match[1].trim()
          break
        }
      }
    }
  }
}

// Check for personal information
function containsPersonalInfo(text: string): boolean {
  const personalPatterns = [
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/, // Full names
    /\b\d{3,4}\s*\d{3,4}\s*\d{3,4}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
  ]
  
  return personalPatterns.some(pattern => pattern.test(text))
}