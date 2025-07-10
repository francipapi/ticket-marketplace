import Tesseract from 'tesseract.js'

// Modern OCR implementation based on 2024 best practices
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
}

interface PreprocessingOptions {
  dpi: number
  contrast: number
  brightness: number
  threshold: number
  denoise: boolean
  sharpen: boolean
  autoRotate: boolean
}

export async function extractTicketInfo(imageFile: File): Promise<ExtractedTicketInfo> {
  console.log('🔬 Starting modern OCR processing...')
  
  try {
    // Step 1: Advanced image preprocessing with multiple versions
    const preprocessedVersions = await createOptimizedVersions(imageFile)
    console.log(`🔧 Created ${preprocessedVersions.length} optimized image versions`)
    
    // Step 2: Run OCR on all versions with optimized settings
    const ocrResults = await runOptimizedOCR(preprocessedVersions)
    console.log(`📊 Completed OCR on ${ocrResults.length} versions`)
    
    // Step 3: Select best result and extract structured data
    const bestResult = selectBestOCRResult(ocrResults)
    console.log(`✅ Best result: ${bestResult.confidence}% confidence`)
    console.log('📝 Raw text preview:', bestResult.text.substring(0, 200) + '...')
    
    // Step 4: Advanced text extraction using multiple strategies
    const extracted = await extractStructuredData(bestResult.text)
    extracted.confidence = bestResult.confidence
    extracted.rawText = bestResult.text
    
    console.log('🎯 Final extraction result:', extracted)
    return extracted
    
  } catch (error) {
    console.error('❌ Modern OCR failed:', error)
    return {
      confidence: 0,
      hasPersonalInfo: false,
      rawText: 'OCR processing failed'
    }
  }
}

// Create multiple optimized image versions for better OCR results
async function createOptimizedVersions(file: File): Promise<Array<{ blob: Blob; name: string }>> {
  const versions: Array<{ blob: Blob; name: string }> = []
  
  try {
    // Load image to canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = await loadImageToCanvas(file, canvas, ctx)
    
    console.log(`🖼️ Original image loaded: ${canvas.width}x${canvas.height}`)
    
    // Always include the original file as a fallback
    versions.push({ blob: file, name: 'original' })
    
    // Try to create processed versions, but continue if any fail
    const processConfigs = [
      {
        name: 'high-contrast',
        options: {
          dpi: 300,
          contrast: 2.0,
          brightness: 1.1,
          threshold: 128,
          denoise: true,
          sharpen: true,
          autoRotate: true
        }
      },
      {
        name: 'adaptive',
        options: {
          dpi: 400,
          contrast: 1.5,
          brightness: 1.0,
          threshold: 0, // Will use adaptive thresholding
          denoise: true,
          sharpen: false,
          autoRotate: true
        }
      },
      {
        name: 'minimal',
        options: {
          dpi: 300,
          contrast: 1.2,
          brightness: 1.0,
          threshold: 128,
          denoise: false,
          sharpen: false,
          autoRotate: false
        }
      }
    ]
    
    for (const config of processConfigs) {
      try {
        console.log(`🔧 Creating ${config.name} version...`)
        const processedBlob = await preprocessImage(canvas, ctx, config.options)
        versions.push({ blob: processedBlob, name: config.name })
        console.log(`✅ ${config.name} version created successfully`)
      } catch (error) {
        console.warn(`⚠️ Failed to create ${config.name} version:`, error)
        // Continue with other versions
      }
    }
    
    console.log(`📦 Created ${versions.length} image versions total`)
    return versions
    
  } catch (error) {
    console.error('❌ Failed to create any optimized versions:', error)
    // Return just the original file as fallback
    return [{ blob: file, name: 'original-fallback' }]
  }
}

// Load image file to canvas
async function loadImageToCanvas(file: File, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    img.onload = () => {
      try {
        // Clean up object URL
        URL.revokeObjectURL(objectUrl)
        
        // Validate image dimensions
        if (img.width === 0 || img.height === 0) {
          reject(new Error('Invalid image dimensions'))
          return
        }
        
        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height
        
        // Clear canvas and draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        
        console.log(`🖼️ Image loaded: ${img.width}x${img.height}, size: ${file.size} bytes`)
        resolve(img)
      } catch (error) {
        URL.revokeObjectURL(objectUrl)
        reject(error)
      }
    }
    
    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image file'))
    }
    
    // Set crossOrigin to handle potential CORS issues
    img.crossOrigin = 'anonymous'
    img.src = objectUrl
  })
}

// Advanced image preprocessing using canvas
async function preprocessImage(
  canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D, 
  options: PreprocessingOptions
): Promise<Blob> {
  try {
    console.log(`🔧 Preprocessing with options:`, options)
    
    // Create a new canvas for processing to avoid corrupting the original
    const processCanvas = document.createElement('canvas')
    const processCtx = processCanvas.getContext('2d')!
    
    // Copy original canvas to processing canvas
    processCanvas.width = canvas.width
    processCanvas.height = canvas.height
    processCtx.drawImage(canvas, 0, 0)
    
    const imageData = processCtx.getImageData(0, 0, processCanvas.width, processCanvas.height)
    const data = imageData.data
    
    console.log(`📏 Image dimensions: ${processCanvas.width}x${processCanvas.height}`)
    
    // Step 1: Brightness and contrast adjustment
    if (options.brightness !== 1.0 || options.contrast !== 1.0) {
      console.log('🔧 Applying brightness/contrast adjustment')
      adjustBrightnessContrast(data, options.brightness, options.contrast)
    }
    
    // Step 2: Denoising (blur to remove artifacts)
    if (options.denoise) {
      console.log('🔧 Applying denoising')
      applyGaussianBlur(data, processCanvas.width, processCanvas.height, 1)
    }
    
    // Step 3: Sharpening (enhance edges)
    if (options.sharpen) {
      console.log('🔧 Applying sharpening')
      applySharpenFilter(data, processCanvas.width, processCanvas.height)
    }
    
    // Step 4: Binarization (convert to black and white)
    if (options.threshold > 0) {
      console.log('🔧 Applying threshold binarization')
      applyThreshold(data, options.threshold)
    } else {
      console.log('🔧 Applying adaptive threshold')
      applyAdaptiveThreshold(data, processCanvas.width, processCanvas.height)
    }
    
    // Put processed image data back
    processCtx.putImageData(imageData, 0, 0)
    
    // Step 5: Scale for optimal DPI (create new canvas if needed)
    let finalCanvas = processCanvas
    if (options.dpi !== 72) {
      console.log(`🔧 Scaling for DPI: ${options.dpi}`)
      const scale = options.dpi / 72
      finalCanvas = scaleCanvas(processCanvas, processCtx, scale)
    }
    
    // Convert to blob with timeout
    return new Promise<Blob>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Canvas to blob conversion timeout'))
      }, 10000) // 10 second timeout
      
      finalCanvas.toBlob((blob) => {
        clearTimeout(timeout)
        if (blob && blob.size > 0) {
          console.log(`✅ Blob created: ${blob.size} bytes`)
          resolve(blob)
        } else {
          console.error('❌ Blob conversion failed or empty blob')
          reject(new Error('Failed to convert canvas to blob or empty result'))
        }
      }, 'image/png', 0.95) // High quality PNG
    })
    
  } catch (error) {
    console.error('❌ Preprocessing failed:', error)
    throw error
  }
}

// Brightness and contrast adjustment
function adjustBrightnessContrast(data: Uint8ClampedArray, brightness: number, contrast: number) {
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255))
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast
    data[i] = factor * (data[i] - 128) + 128     // Red
    data[i + 1] = factor * (data[i + 1] - 128) + 128 // Green  
    data[i + 2] = factor * (data[i + 2] - 128) + 128 // Blue
    
    // Apply brightness
    data[i] = Math.min(255, Math.max(0, data[i] * brightness))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * brightness))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * brightness))
  }
}

// Gaussian blur for denoising
function applyGaussianBlur(data: Uint8ClampedArray, width: number, height: number, radius: number) {
  // Simple box blur approximation for performance
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1]
  const kernelSum = 16
  
  const tempData = new Uint8ClampedArray(data.length)
  tempData.set(data)
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB channels only
        let sum = 0
        let kernelIndex = 0
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + c
            sum += tempData[pixelIndex] * kernel[kernelIndex++]
          }
        }
        
        const pixelIndex = (y * width + x) * 4 + c
        data[pixelIndex] = sum / kernelSum
      }
    }
  }
}

// Sharpen filter to enhance edges
function applySharpenFilter(data: Uint8ClampedArray, width: number, height: number) {
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]
  const tempData = new Uint8ClampedArray(data.length)
  tempData.set(data)
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0
        let kernelIndex = 0
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + c
            sum += tempData[pixelIndex] * kernel[kernelIndex++]
          }
        }
        
        const pixelIndex = (y * width + x) * 4 + c
        data[pixelIndex] = Math.min(255, Math.max(0, sum))
      }
    }
  }
}

// Simple threshold binarization
function applyThreshold(data: Uint8ClampedArray, threshold: number) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const binary = gray > threshold ? 255 : 0
    
    data[i] = binary     // Red
    data[i + 1] = binary // Green
    data[i + 2] = binary // Blue
    // Alpha channel stays the same
  }
}

// Adaptive threshold for varying backgrounds
function applyAdaptiveThreshold(data: Uint8ClampedArray, width: number, height: number) {
  const windowSize = 15
  const c = 10 // Constant subtracted from mean
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      
      // Calculate local mean
      let sum = 0
      let count = 0
      
      for (let wy = Math.max(0, y - windowSize); wy < Math.min(height, y + windowSize + 1); wy++) {
        for (let wx = Math.max(0, x - windowSize); wx < Math.min(width, x + windowSize + 1); wx++) {
          const idx = (wy * width + wx) * 4
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
          sum += gray
          count++
        }
      }
      
      const localMean = sum / count
      const currentGray = 0.299 * data[pixelIndex] + 0.587 * data[pixelIndex + 1] + 0.114 * data[pixelIndex + 2]
      const binary = currentGray > (localMean - c) ? 255 : 0
      
      data[pixelIndex] = binary
      data[pixelIndex + 1] = binary
      data[pixelIndex + 2] = binary
    }
  }
}

// Scale canvas for DPI optimization
function scaleCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, scale: number): HTMLCanvasElement {
  const scaledCanvas = document.createElement('canvas')
  const scaledCtx = scaledCanvas.getContext('2d')!
  
  scaledCanvas.width = canvas.width * scale
  scaledCanvas.height = canvas.height * scale
  
  scaledCtx.imageSmoothingEnabled = false // Preserve sharp edges
  scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height)
  
  return scaledCanvas
}

// Run optimized OCR with 2024 best practices
async function runOptimizedOCR(versions: Array<{ blob: Blob; name: string }>): Promise<Array<{ text: string; confidence: number; version: string }>> {
  const results = []
  
  for (const version of versions) {
    try {
      console.log(`🔍 Running OCR on ${version.name} version...`)
      
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => console.log(`🔧 Tesseract-${version.name}:`, m.status, m.progress?.toFixed(2) + '%')
      })
      
      // 2024 optimized parameters based on research
      await worker.setParameters({
        // Page segmentation mode: SINGLE_BLOCK for structured tickets
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        
        // OCR Engine Mode: LSTM_ONLY for better accuracy
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        
        // Character whitelist optimized for tickets
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-/()@ £$€+GMT',
        
        // Preserve spaces (critical for ticket parsing)
        preserve_interword_spaces: '1',
        
        // Quality settings for mobile images
        user_defined_dpi: '300',
        textord_min_linesize: '1.25',
        
        // Confidence thresholds
        tessedit_reject_mode: '0',
        load_system_dawg: '0',
        load_freq_dawg: '0',
        
        // Additional 2024 optimizations
        textord_really_old_xheight: '0',
        textord_min_xheight: '10',
        classify_enable_learning: '0'
      })
      
      const result = await worker.recognize(version.blob)
      await worker.terminate()
      
      results.push({
        text: result.data.text,
        confidence: result.data.confidence,
        version: version.name
      })
      
      console.log(`✅ ${version.name}: ${result.data.confidence.toFixed(1)}% confidence`)
      
    } catch (error) {
      console.error(`❌ OCR failed for ${version.name}:`, error)
    }
  }
  
  return results
}

// Select the best OCR result based on multiple factors
function selectBestOCRResult(results: Array<{ text: string; confidence: number; version: string }>): { text: string; confidence: number; version: string } {
  if (results.length === 0) {
    return { text: '', confidence: 0, version: 'none' }
  }
  
  // Score each result based on confidence and text quality indicators
  const scoredResults = results.map(result => {
    let score = result.confidence * 0.7 // Base confidence weight
    
    // Boost for length (more text usually means better extraction)
    score += Math.min(result.text.length / 10, 20)
    
    // Boost for ticket-specific content
    const ticketKeywords = ['ticket', 'entry', 'event', 'party', 'concert', 'venue', 'date', 'time', 'order', 'reference']
    const keywordMatches = ticketKeywords.filter(keyword => 
      result.text.toLowerCase().includes(keyword)
    ).length
    score += keywordMatches * 5
    
    // Boost for structured content (dates, times, etc.)
    if (result.text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/)) score += 10 // Date pattern
    if (result.text.match(/\d{1,2}:\d{2}/)) score += 8 // Time pattern
    if (result.text.match(/[A-Z][a-z]+,\s*\d{1,2}\s+[A-Z][a-z]+\s+\d{4}/)) score += 15 // Full date
    
    return { ...result, score }
  })
  
  // Return the highest scoring result
  const best = scoredResults.reduce((best, current) => 
    current.score > best.score ? current : best
  )
  
  console.log(`🏆 Selected ${best.version} version (score: ${best.score.toFixed(1)})`)
  return best
}

// Extract structured data using modern parsing techniques
async function extractStructuredData(text: string): Promise<ExtractedTicketInfo> {
  console.log('🧠 Extracting structured data...')
  
  const extracted: ExtractedTicketInfo = {
    confidence: 0,
    hasPersonalInfo: false
  }
  
  // Clean and normalize text
  const cleanText = normalizeText(text)
  const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  console.log('📄 Cleaned lines:', lines)
  
  // Multiple extraction strategies
  await extractByStructuralAnalysis(lines, extracted)
  await extractByPatternMatching(cleanText, extracted)
  await extractBySemanticAnalysis(lines, extracted)
  
  // Check for personal information
  extracted.hasPersonalInfo = containsPersonalInfo(cleanText)
  
  console.log('🎯 Structured extraction complete:', extracted)
  return extracted
}

// Normalize text for better parsing
function normalizeText(text: string): string {
  return text
    // Fix common OCR errors
    .replace(/[|]/g, 'I')
    .replace(/\b0(?=[A-Za-z])/g, 'O')
    .replace(/\b5(?=[A-Za-z])/g, 'S')
    .replace(/\b1(?=[A-Za-z])/g, 'I')
    .replace(/\bI(?=\d)/g, '1')
    .replace(/\bO(?=\d)/g, '0')
    
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    
    // Fix punctuation
    .replace(/(\d)[|\/\\](\d)/g, '$1/$2')
    .replace(/(\d)[|](\d{2})/g, '$1:$2')
    
    .trim()
}

// Structural analysis for mobile tickets
async function extractByStructuralAnalysis(lines: string[], extracted: ExtractedTicketInfo) {
  console.log('📱 Analyzing mobile ticket structure...')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    const nextLine = i + 1 < lines.length ? lines[i + 1] : ''
    const originalLine = lines[i]
    
    // Mobile ticket field patterns
    if (line === 'name' && nextLine) {
      extracted.holderName = nextLine
      console.log(`📱 Found holder name: ${nextLine}`)
    }
    
    if ((line === 'order reference' || line === 'order ref') && nextLine) {
      extracted.orderReference = nextLine
      console.log(`📱 Found order reference: ${nextLine}`)
    }
    
    if ((line === 'ticket name' || line === 'ticket type') && nextLine) {
      extracted.ticketType = nextLine
      console.log(`📱 Found ticket type: ${nextLine}`)
    }
    
    if ((line === 'opening time' || line === 'event date') && nextLine) {
      const dateMatch = nextLine.match(/([A-Za-z]+,?\s*\d{1,2}\s+[A-Za-z]+\s+\d{4})/)
      if (dateMatch) {
        extracted.eventDate = dateMatch[1]
        console.log(`📱 Found event date: ${dateMatch[1]}`)
        
        // Extract time if present
        const timeMatch = nextLine.match(/(\d{1,2}:\d{2}(?:\s*GMT[+\-]\d+)?)/)
        if (timeMatch) {
          extracted.eventTime = timeMatch[1]
          console.log(`📱 Found event time: ${timeMatch[1]}`)
        }
      }
    }
    
    // Event name is often before "Name" field
    if (nextLine.toLowerCase() === 'name' && originalLine.length > 5) {
      if (!originalLine.toLowerCase().includes('ticket') && 
          !originalLine.toLowerCase().includes('order') &&
          !originalLine.toLowerCase().includes('transfer')) {
        extracted.eventName = originalLine
        console.log(`📱 Found event name: ${originalLine}`)
      }
    }
  }
}

// Pattern-based extraction
async function extractByPatternMatching(text: string, extracted: ExtractedTicketInfo) {
  console.log('🔍 Pattern matching extraction...')
  
  // Date patterns
  if (!extracted.eventDate) {
    const datePatterns = [
      /((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i,
      /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/
    ]
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        extracted.eventDate = match[1]
        console.log(`🔍 Found date pattern: ${match[1]}`)
        break
      }
    }
  }
  
  // Event name patterns
  if (!extracted.eventName) {
    const eventPatterns = [
      /(?:the\s+)?([A-Z][A-Za-z\s&']+(?:Party|Event|Concert|Festival|Ball|Show|Gala|Tour))/i,
      /([A-Z][A-Za-z\s]+Halloween[A-Za-z\s]*Party)/i,
      /([A-Z][A-Za-z\s]+(?:Concert|Show|Festival|Ball))/i
    ]
    
    for (const pattern of eventPatterns) {
      const match = text.match(pattern)
      if (match) {
        extracted.eventName = match[1].trim()
        console.log(`🔍 Found event pattern: ${match[1]}`)
        break
      }
    }
  }
  
  // Ticket type patterns
  if (!extracted.ticketType) {
    const ticketPatterns = [
      /(Advance Entry|General Admission|VIP|Student Entry|Early Bird)/i,
      /(?:ticket\s*type|ticket\s*name)[:\s]*([A-Za-z\s]+)/i
    ]
    
    for (const pattern of ticketPatterns) {
      const match = text.match(pattern)
      if (match) {
        extracted.ticketType = match[1].trim()
        console.log(`🔍 Found ticket type pattern: ${match[1]}`)
        break
      }
    }
  }
}

// Semantic analysis for context-aware extraction
async function extractBySemanticAnalysis(lines: string[], extracted: ExtractedTicketInfo) {
  console.log('🧠 Semantic analysis...')
  
  // Find lines that semantically look like event names
  if (!extracted.eventName) {
    for (const line of lines) {
      if (line.length > 10 && line.length < 50) {
        // Look for title-case text that could be an event name
        if (line.match(/^[A-Z][A-Za-z\s]+$/) && 
            (line.toLowerCase().includes('party') || 
             line.toLowerCase().includes('event') ||
             line.toLowerCase().includes('concert') ||
             line.toLowerCase().includes('festival') ||
             line.toLowerCase().includes('ball') ||
             line.toLowerCase().includes('halloween') ||
             line.toLowerCase().includes('smack'))) {
          extracted.eventName = line
          console.log(`🧠 Semantic event name: ${line}`)
          break
        }
      }
    }
  }
  
  // Find lines that look like ticket types
  if (!extracted.ticketType) {
    for (const line of lines) {
      if (line.toLowerCase().includes('advance') || 
          line.toLowerCase().includes('entry') ||
          line.toLowerCase().includes('admission') ||
          line.toLowerCase().includes('vip') ||
          line.toLowerCase().includes('student')) {
        extracted.ticketType = line
        console.log(`🧠 Semantic ticket type: ${line}`)
        break
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