# Claude Development Guidelines

## Research Requirements

**IMPORTANT: Always research documentation online before implementing manual solutions.**

When working with external APIs, services, or frameworks:

1. **Research First**: Always look up the official documentation online before implementing workarounds
2. **Use Official Methods**: Prefer documented API methods over manual alternatives
3. **Verify Syntax**: Check the correct syntax and parameters for API calls
4. **Test Approaches**: Try multiple documented approaches before falling back to manual solutions

This approach ensures:
- Better compatibility with service updates
- More reliable and maintainable code
- Proper usage of API features
- Fewer unexpected errors

## Project Context

This is a ticket marketplace application using:
- **Frontend**: Next.js 15 with React
- **Authentication**: Clerk
- **Database**: Airtable
- **Styling**: Tailwind CSS

## Database Schema

### Airtable Tables:
- **Users**: Contains user profiles with Clerk integration
- **Listings**: Ticket listings with linked seller field
- **Offers**: Purchase offers with linked buyer and listing fields
- **Transactions**: Payment records

### Key Field Types:
- Linked record fields use arrays of record IDs (e.g., `[recordId]`)
- Date fields expect YYYY-MM-DD format
- Price fields store values in cents

## Common Issues and Solutions

### Airtable Filtering for Linked Records
Use `FIND()` with `ARRAYJOIN()` for most reliable filtering:
```javascript
// Recommended approach
`FIND('${recordId}', ARRAYJOIN({linkedField})) > 0`

// Alternative approaches if needed
`SEARCH('${recordId}', ARRAYJOIN({linkedField}))`
`{linkedField} = '${recordId}'` // For single linked records
```

### Next.js 15 Async Params
All route parameters are now async:
```javascript
// Correct Next.js 15 syntax
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### Error Handling
Always implement retry logic and fallbacks for Airtable operations due to rate limiting and API limitations.