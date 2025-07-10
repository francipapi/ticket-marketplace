# Cross-Platform Compatibility Fixes

## Overview
This document outlines the changes made to ensure cross-platform compatibility between macOS and Windows for the ticket marketplace application.

## Issues Identified and Fixed

### 1. Package.json Scripts
**Issue**: Unix-specific commands that don't work on Windows
- `clean` script used `rm -rf` which is not available on Windows by default

**Fix**: 
- Added `rimraf` and `cross-env` packages for cross-platform compatibility
- Updated `clean` script to use `rimraf` instead of `rm -rf`
- Properly quoted glob patterns for Windows compatibility

```json
// Before
"clean": "rm -rf .next node_modules prisma/dev.db public/uploads/*"

// After  
"clean": "rimraf .next node_modules prisma/dev.db \"public/uploads/*\""
```

### 2. File Path Handling
**Issue**: Hardcoded forward slashes and inconsistent path handling
- File paths used forward slashes directly instead of path.join()
- String manipulation for path operations that don't work on Windows

**Fix**:
- Updated all file path operations to use Node.js `path` module
- Created cross-platform path utilities in `lib/utils/path.ts`
- Fixed environment variable defaults to use relative paths

#### Key Changes in `lib/upload.ts`:
```typescript
// Before
private uploadDir = process.env.UPLOAD_DIR || './public/uploads';

// After
private uploadDir = process.env.UPLOAD_DIR || path.join('.', 'public', 'uploads');
```

```typescript
// Before
private getRelativePath(fullPath: string): string {
  return fullPath.replace(process.cwd(), '').replace(/^\//, '');
}

// After
private getRelativePath(fullPath: string): string {
  return getRelativePathFromRoot(fullPath);
}
```

### 3. Environment Variable Defaults
**Issue**: Default paths used forward slashes
- `UPLOAD_DIR` default was `'./public/uploads'`

**Fix**:
- Updated defaults to use relative paths without hardcoded separators
- Changed from `'./public/uploads'` to `'public/uploads'`

### 4. Cross-Platform Path Utilities
**Created**: `lib/utils/path.ts` with utilities for cross-platform path handling

Key functions:
- `pathToUrl()`: Converts file system paths to URL-safe paths
- `getRelativePathFromRoot()`: Gets relative path from project root
- `joinUrlPath()`: Joins paths and returns URL-safe format
- `getUserUploadDir()`: Gets user-specific upload directory
- `uploadPathToPublicUrl()`: Converts upload paths to public URLs

## Testing
Created comprehensive test script `scripts/test-cross-platform.ts` that validates:
- Path utility functions work correctly
- File system operations use proper path separators
- Environment variables are handled correctly
- Cross-platform path operations work as expected

## Benefits
1. **Windows Compatibility**: Application now works on Windows without path-related errors
2. **Consistent Path Handling**: All path operations use cross-platform methods
3. **URL Safety**: File paths are properly converted to URLs regardless of platform
4. **Maintainability**: Centralized path utilities make future changes easier

## Files Modified
- `package.json` - Updated scripts to use cross-platform tools
- `lib/upload.ts` - Fixed file path handling
- `lib/env-config.ts` - Updated environment variable defaults
- `lib/validations.ts` - Updated validation schema defaults
- `lib/utils/path.ts` - New cross-platform path utilities (created)
- `scripts/test-cross-platform.ts` - Test script for validation (created)

## Dependencies Added
- `rimraf` - Cross-platform file deletion
- `cross-env` - Cross-platform environment variable support

## Migration Notes
- No breaking changes to existing functionality
- All existing file paths continue to work
- Environment variables maintain backward compatibility
- Upload functionality remains unchanged from user perspective

## Future Considerations
- All new file path operations should use the utilities in `lib/utils/path.ts`
- When adding new npm scripts, ensure they use cross-platform commands
- Test on both Windows and Unix-based systems before deployment