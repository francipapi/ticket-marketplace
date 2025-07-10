import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { getRelativePathFromRoot, getUserUploadDir } from './utils/path';

export interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

export class FileService {
  private uploadDir = process.env.UPLOAD_DIR || path.join('.', 'public', 'uploads');
  
  async ensureUploadDir(userId: string) {
    const userDir = getUserUploadDir(userId);
    await fs.mkdir(userDir, { recursive: true });
    return userDir;
  }
  
  async saveFile(
    file: File,
    userId: string,
    options?: { addWatermark?: boolean }
  ): Promise<UploadedFile> {
    const fileId = uuidv4();
    const ext = path.extname(file.name);
    const fileName = `${fileId}${ext}`;
    
    const userDir = await this.ensureUploadDir(userId);
    const filePath = path.join(userDir, fileName);
    
    // Save original file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    
    // Add watermark if image
    if (options?.addWatermark && file.type.startsWith('image/')) {
      await this.addWatermark(filePath, userId);
    }
    
    return {
      id: fileId,
      originalName: file.name,
      fileName,
      filePath: this.getRelativePath(filePath),
      fileType: file.type,
      fileSize: file.size,
      uploadedAt: new Date(),
    };
  }
  
  private async addWatermark(imagePath: string, userId: string) {
    const watermarkText = `Marketplace Preview - User ${userId.slice(0, 8)}`;
    
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      // Create watermark SVG
      const watermarkSvg = `
        <svg width="${metadata.width}" height="${metadata.height}">
          <text x="50%" y="50%" 
                font-family="Arial, sans-serif" 
                font-size="${Math.min(metadata.width! / 15, 40)}" 
                fill="rgba(255,255,255,0.7)" 
                text-anchor="middle" 
                dominant-baseline="middle"
                transform="rotate(-30 ${metadata.width! / 2} ${metadata.height! / 2})">
            ${watermarkText}
          </text>
        </svg>
      `;
      
      const ext = path.extname(imagePath);
      const base = path.basename(imagePath, ext);
      const dir = path.dirname(imagePath);
      const watermarkedPath = path.join(dir, `${base}_watermarked${ext}`);
      
      await image
        .composite([{
          input: Buffer.from(watermarkSvg),
          gravity: 'center',
        }])
        .toFile(watermarkedPath);
        
      console.log(`✅ Watermark added: ${watermarkedPath}`);
    } catch (error) {
      console.error('❌ Watermark failed:', error);
      // Continue without watermark if it fails
    }
  }
  
  private getRelativePath(fullPath: string): string {
    return getRelativePathFromRoot(fullPath);
  }
  
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(path.join(process.cwd(), filePath));
      return true;
    } catch {
      return false;
    }
  }
}

export const fileService = new FileService();