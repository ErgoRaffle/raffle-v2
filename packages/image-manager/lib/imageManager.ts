import { downloadImage } from './imageDownloader';
import { IpfsUploader, IpfsUploaderConfig } from './ipfsUploader';

class ImageManager {
  private uploader: IpfsUploader;

  private constructor(uploader: IpfsUploader) {
    this.uploader = uploader;
  }

  /**
   * Creates and initializes an ImageManager with Filebase credentials.
   * @param config - Filebase S3 access key, secret, and bucket for IPFS uploads
   * @returns Initialized ImageManager instance
   */
  static create = async (config: IpfsUploaderConfig): Promise<ImageManager> => {
    const uploader = await IpfsUploader.create(config);
    return new ImageManager(uploader);
  };

  /**
   * Downloads an image from the given URL, uploads it to IPFS,
   * and returns the resulting content identifier.
   * @param url - The HTTP(S) URL of the image to download
   * @returns The IPFS content identifier (CID) as a string
   */
  processImage = async (url: string): Promise<string> => {
    const imageBlob = await downloadImage(url);
    const filename = extractFilename(url);
    return this.uploader.upload(imageBlob, filename);
  };

  /**
   * Downloads multiple images from the given URLs, uploads each to IPFS,
   * and returns the resulting content identifiers in the same order.
   * @param urls - Array of HTTP(S) image URLs
   * @returns Array of IPFS content identifiers (CIDs)
   */
  processImages = async (urls: string[]): Promise<string[]> => {
    return Promise.all(urls.map((url) => this.processImage(url)));
  };
}

/**
 * Extracts a filename from a URL, falling back to "image" if none is found.
 * @param url - The URL to extract a filename from
 * @returns The extracted filename
 */
const extractFilename = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : 'image';
  } catch {
    return 'image';
  }
};

export { ImageManager };
