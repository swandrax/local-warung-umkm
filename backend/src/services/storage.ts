import { join } from 'path';
import { unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export interface IImageStorageProvider {
  upload(file: Blob, folder?: string): Promise<string>;
  replace(oldUrl: string | null, newFile: Blob, folder?: string): Promise<string>;
  delete(fileUrl: string): Promise<boolean>;
  getPublicUrl(filename: string): string;
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class LocalStorageProvider implements IImageStorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    this.uploadDir = join(process.cwd(), 'uploads');
    this.baseUrl = process.env.PUBLIC_STORAGE_URL || 'http://localhost:3000/uploads';
    if (!existsSync(this.uploadDir)) {
      mkdir(this.uploadDir, { recursive: true }).catch(() => {});
    }
  }

  private async validateFile(file: Blob): Promise<string> {
    if (!file || file.size === 0) {
      throw new Error('File is empty or invalid');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit');
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error('Unsupported image format. Allowed: JPEG, PNG, WEBP');
    }

    // Inspect magic bytes to verify genuine image and reject scripts/executables
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let detectedExt = '';

    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      detectedExt = 'jpg';
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    else if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
    ) {
      detectedExt = 'png';
    }
    // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
    else if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      detectedExt = 'webp';
    } else {
      throw new Error('Malformed or dangerous file: content does not match image signature');
    }

    return detectedExt;
  }

  async upload(file: Blob): Promise<string> {
    const ext = await this.validateFile(file);

    // Secure randomized filename
    const filename = `${crypto.randomUUID()}.${ext}`;
    const filePath = join(this.uploadDir, filename);

    await Bun.write(filePath, file);
    return `${this.baseUrl}/${filename}`;
  }

  async replace(oldUrl: string | null, newFile: Blob): Promise<string> {
    if (oldUrl) {
      await this.delete(oldUrl);
    }
    return this.upload(newFile);
  }

  async delete(fileUrl: string): Promise<boolean> {
    try {
      if (!fileUrl.startsWith(this.baseUrl)) return false;

      const filename = fileUrl.replace(`${this.baseUrl}/`, '');
      // Strict anti-path-traversal check
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return false;
      }

      const filePath = join(this.uploadDir, filename);
      if (existsSync(filePath)) {
        await unlink(filePath);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to delete file:', e);
      return false;
    }
  }

  getPublicUrl(filename: string): string {
    return `${this.baseUrl}/${filename}`;
  }
}

export const storageService = new LocalStorageProvider();
