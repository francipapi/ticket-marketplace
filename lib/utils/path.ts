/**
 * Cross-platform path utilities
 * Ensures consistent path handling across Windows and Unix-based systems
 */

import path from 'path';

/**
 * Convert a file system path to a URL-safe path
 * Always uses forward slashes regardless of platform
 */
export function pathToUrl(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

/**
 * Get a relative path from the project root
 * Returns a URL-safe path with forward slashes
 */
export function getRelativePathFromRoot(absolutePath: string): string {
  const relativePath = path.relative(process.cwd(), absolutePath);
  return pathToUrl(relativePath);
}

/**
 * Join paths in a cross-platform way and return URL-safe path
 */
export function joinUrlPath(...segments: string[]): string {
  const joined = path.join(...segments);
  return pathToUrl(joined);
}

/**
 * Ensure a directory path exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  const fs = await import('fs/promises');
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Get the upload directory path for a specific user
 */
export function getUserUploadDir(userId: string): string {
  const uploadBase = process.env.UPLOAD_DIR || path.join('public', 'uploads');
  return path.join(uploadBase, userId);
}

/**
 * Convert a relative upload path to a public URL
 */
export function uploadPathToPublicUrl(uploadPath: string): string {
  // Remove 'public' prefix if present and ensure forward slashes
  const urlPath = pathToUrl(uploadPath).replace(/^public\//, '/');
  return urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
}