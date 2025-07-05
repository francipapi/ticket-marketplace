#!/usr/bin/env tsx
// Script to fetch actual Airtable field names from the API
// This will help us verify and fix field mapping inconsistencies

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local')
console.log('Loading environment from:', envPath)
const envResult = dotenv.config({ path: envPath })
if (envResult.error) {
  console.error('Error loading .env.local:', envResult.error)
  process.exit(1)
}

async function fetchAirtableSchema() {
  console.log('🔍 Fetching Airtable Schema')
  console.log('=' .repeat(60))
  
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  
  if (!apiKey || !baseId) {
    console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID')
    process.exit(1)
  }
  
  console.log(`🔗 Base ID: ${baseId}`)
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`)
  
  try {
    // Fetch base schema using the official metadata API
    const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
    console.log(`📡 Fetching from: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error (${response.status}):`, errorText)
      
      if (response.status === 401) {
        console.error('🔐 Authentication failed. Please check your API key.')
        console.error('💡 Note: As of February 2024, Airtable requires Personal Access Tokens (PATs)')
        console.error('   Generate one at: https://airtable.com/create/tokens')
      } else if (response.status === 403) {
        console.error('🚫 Permission denied. Please ensure your token has schema.bases:read scope.')
      } else if (response.status === 404) {
        console.error('❓ Base not found. Please check your base ID.')
      }
      
      process.exit(1)
    }
    
    const schema = await response.json()
    console.log('✅ Successfully fetched base schema')
    
    // Parse and display the schema
    console.log('\n📊 Base Schema:')
    console.log('Tables found:', schema.tables?.length || 0)
    
    if (schema.tables) {
      for (const table of schema.tables) {
        console.log(`\n🗂️  Table: "${table.name}" (ID: ${table.id})`)
        console.log(`   Primary Field: ${table.primaryFieldId}`)
        console.log(`   Fields (${table.fields?.length || 0}):`)
        
        if (table.fields) {
          for (const field of table.fields) {
            console.log(`     • "${field.name}" (${field.type}) - ID: ${field.id}`)
            
            // Show special properties for certain field types
            if (field.type === 'multipleRecordLinks') {
              console.log(`       -> Links to table: ${field.options?.linkedTableId}`)
            }
            if (field.type === 'singleSelect' || field.type === 'multipleSelects') {
              const choices = field.options?.choices?.map((c: any) => c.name).join(', ')
              console.log(`       -> Choices: ${choices}`)
            }
          }
        }
      }
    }
    
    // Generate field mappings for each table
    console.log('\n📝 Generated Field Mappings:')
    console.log('=' .repeat(60))
    
    const fieldMappings: Record<string, Record<string, string>> = {}
    
    if (schema.tables) {
      for (const table of schema.tables) {
        const tableName = table.name.toLowerCase()
        fieldMappings[tableName] = {}
        
        console.log(`\n// ${table.name} table field mapping`)
        console.log(`${tableName}: {`)
        
        if (table.fields) {
          for (const field of table.fields) {
            // Convert field name to camelCase for API
            const apiFieldName = field.name
              .replace(/\s+/g, '') // Remove spaces
              .replace(/[()]/g, '') // Remove parentheses
              .replace(/^./, (str: string) => str.toLowerCase()) // First letter lowercase
              .replace(/([A-Z])/g, (match: string) => match.toLowerCase()) // Convert to camelCase
            
            fieldMappings[tableName][apiFieldName] = field.name
            console.log(`  ${apiFieldName}: '${field.name}',`)
          }
        }
        
        console.log(`},`)
      }
    }
    
    // Save the schema to a file for reference
    const schemaData = {
      fetchedAt: new Date().toISOString(),
      baseId,
      schema,
      fieldMappings
    }
    
    console.log('\n💾 Saving schema data to airtable-schema.json')
    await import('fs').then(fs => {
      fs.writeFileSync(
        path.join(process.cwd(), 'airtable-schema.json'),
        JSON.stringify(schemaData, null, 2)
      )
    })
    
    console.log('\n🎉 Schema fetch complete!')
    console.log('📄 Schema saved to: airtable-schema.json')
    
  } catch (error: any) {
    console.error('❌ Error fetching schema:', error.message)
    
    if (error.code === 'ENOTFOUND') {
      console.error('🌐 Network error. Please check your internet connection.')
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('🔗 Fetch API error. Please check the request URL and headers.')
    }
    
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  fetchAirtableSchema().catch(console.error)
}

export { fetchAirtableSchema }