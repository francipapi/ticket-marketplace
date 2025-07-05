#!/usr/bin/env tsx
// Script to verify that all field mappings in our code match the actual Airtable schema

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

async function verifyFieldMappings() {
  console.log('🔍 Verifying Field Mappings Against Airtable Schema')
  console.log('=' .repeat(70))
  
  // Load the actual schema we fetched
  const schemaPath = path.join(process.cwd(), 'airtable-schema.json')
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ airtable-schema.json not found. Run fetch-airtable-schema.ts first.')
    process.exit(1)
  }
  
  const schemaData = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
  const actualSchema = schemaData.schema
  
  // Load our current field mappings
  const { AIRTABLE_FIELD_MAPPINGS } = await import('../lib/airtable-client')
  
  console.log('📊 Verifying field mappings...')
  
  let allMappingsValid = true
  
  // Verify each table
  for (const table of actualSchema.tables) {
    const tableName = table.name.toLowerCase()
    console.log(`\n🗂️  Table: ${table.name}`)
    
    if (!AIRTABLE_FIELD_MAPPINGS[tableName as keyof typeof AIRTABLE_FIELD_MAPPINGS]) {
      console.log(`❌ No mapping found for table: ${tableName}`)
      allMappingsValid = false
      continue
    }
    
    const ourMappings = AIRTABLE_FIELD_MAPPINGS[tableName as keyof typeof AIRTABLE_FIELD_MAPPINGS]
    const actualFields = table.fields.map((f: any) => f.name)
    
    console.log(`   Actual fields (${actualFields.length}):`, actualFields.join(', '))
    console.log(`   Our mappings (${Object.keys(ourMappings).length}):`, Object.values(ourMappings).join(', '))
    
    // Check if all our mapped fields exist in Airtable
    for (const [apiField, airtableField] of Object.entries(ourMappings)) {
      if (!actualFields.includes(airtableField)) {
        console.log(`   ❌ Mapped field "${airtableField}" (${apiField}) does not exist in Airtable`)
        allMappingsValid = false
      } else {
        console.log(`   ✅ ${apiField} → "${airtableField}"`)
      }
    }
    
    // Check if there are Airtable fields we're not mapping
    const unmappedFields = actualFields.filter(field => 
      !Object.values(ourMappings).includes(field)
    )
    
    if (unmappedFields.length > 0) {
      console.log(`   ⚠️  Unmapped Airtable fields: ${unmappedFields.join(', ')}`)
    }
  }
  
  // Test message template mappings specifically
  console.log('\n🗣️  Testing Message Template Mappings')
  const offersTable = actualSchema.tables.find((t: any) => t.name === 'Offers')
  if (offersTable) {
    const messageField = offersTable.fields.find((f: any) => f.name === 'message')
    if (messageField && messageField.options && messageField.options.choices) {
      const actualChoices = messageField.options.choices.map((c: any) => c.name)
      console.log(`   Actual Airtable choices: ${actualChoices.join(', ')}`)
      
      const expectedApiValues = ['asking_price', 'make_offer', 'check_availability']
      const expectedAirtableValues = ['Buy at asking price', 'Make offer', 'Check availability']
      
      console.log(`   Expected API values: ${expectedApiValues.join(', ')}`)
      console.log(`   Expected Airtable values: ${expectedAirtableValues.join(', ')}`)
      
      const mappingMatches = expectedAirtableValues.every(choice => actualChoices.includes(choice))
      if (mappingMatches) {
        console.log('   ✅ Message template mappings match')
      } else {
        console.log('   ❌ Message template mappings do not match')
        allMappingsValid = false
      }
    }
  }
  
  // Test linked record references
  console.log('\n🔗 Testing Linked Record References')
  
  const linkTests = [
    { table: 'Listings', field: 'seller', expectedTarget: 'Users' },
    { table: 'Offers', field: 'listing', expectedTarget: 'Listings' },
    { table: 'Offers', field: 'buyer', expectedTarget: 'Users' },
    { table: 'Transactions', field: 'offer', expectedTarget: 'Offers' }
  ]
  
  for (const test of linkTests) {
    const table = actualSchema.tables.find((t: any) => t.name === test.table)
    if (table) {
      const field = table.fields.find((f: any) => f.name === test.field)
      if (field && field.type === 'multipleRecordLinks') {
        const targetTableId = field.options.linkedTableId
        const targetTable = actualSchema.tables.find((t: any) => t.id === targetTableId)
        if (targetTable && targetTable.name === test.expectedTarget) {
          console.log(`   ✅ ${test.table}.${test.field} → ${test.expectedTarget}`)
        } else {
          console.log(`   ❌ ${test.table}.${test.field} expected to link to ${test.expectedTarget}, but links to ${targetTable?.name || 'unknown'}`)
          allMappingsValid = false
        }
      } else {
        console.log(`   ❌ ${test.table}.${test.field} is not a linked record field`)
        allMappingsValid = false
      }
    }
  }
  
  console.log('\n' + '=' .repeat(70))
  if (allMappingsValid) {
    console.log('🎉 All field mappings are VALID!')
    console.log('✅ Field names match Airtable schema')
    console.log('✅ Message template mappings are correct')
    console.log('✅ Linked record references are valid')
  } else {
    console.log('❌ Some field mappings are INVALID!')
    console.log('🔧 Please fix the issues above before proceeding')
    process.exit(1)
  }
  
  console.log('\n📋 Summary:')
  console.log(`   Tables verified: ${actualSchema.tables.length}`)
  console.log(`   Total fields: ${actualSchema.tables.reduce((sum: number, t: any) => sum + t.fields.length, 0)}`)
  console.log(`   Verification completed: ${new Date().toISOString()}`)
}

// Run the script
if (require.main === module) {
  verifyFieldMappings().catch(console.error)
}

export { verifyFieldMappings }