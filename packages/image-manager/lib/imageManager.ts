import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import { downloadImage } from './imageDownloader';
import { IpfsUploader, IpfsUploaderConfig } from './ipfsUploader';

class ImageManager {
  private uploader: IpfsUploader;
  private logger: AbstractLogger;

  private constructor(uploader: IpfsUploader, logger: AbstractLogger) {
    this.uploader = uploader;
    this.logger = logger;
  }

  /**
   * Creates and initializes an ImageManager with Filebase credentials.
   * @param config - Filebase S3 access key, secret, and bucket for IPFS uploads
   * @param logger - Optional structured logger; uses a no-op logger when omitted
   * @returns Initialized ImageManager instance
   */
  static create = async (
    config: IpfsUploaderConfig,
    logger: AbstractLogger = new DummyLogger(),
  ): Promise<ImageManager> => {
    const uploader = await IpfsUploader.create(config);
    logger.info('IPFS uploader is ready');
    return new ImageManager(uploader, logger);
  };

  /**
   * Downloads an image from the given URL, uploads it to IPFS,
   * and returns the resulting content identifier.
   * @param url - The HTTP(S) URL of the image to download
   * @param imageKey - The unique key for the image
   * @returns The IPFS content identifier (CID) as a string
   */
  processImage = async (url: string, imageKey: string): Promise<string> => {
    this.logger.debug(`ImageManager: downloading image from ${url}`);
    const imageBlob = await downloadImage(url);
    this.logger.debug(`uploading "${imageKey}" (${imageBlob.size} bytes)`);
    const cid = await this.uploader.upload(imageBlob, imageKey);
    this.logger.info(`stored image on IPFS (cid=${cid}, key=${imageKey})`);
    return cid;
  };

  /**
   * Downloads multiple images from the given URLs, uploads each to IPFS with a unique key,
   * and returns the resulting content identifiers in the same order.
   * @param urls - Array of HTTP(S) image URLs
   * @param proxyBoxId - Stable id used as the object-key prefix
   * @returns Array of IPFS content identifiers (CIDs)
   */
  processImages = async (
    urls: string[],
    proxyBoxId: string,
  ): Promise<string[]> => {
    this.logger.debug(
      `batch processing ${urls.length} image URL(s) under proxyBoxId=${proxyBoxId}`,
    );
    return Promise.all(
      urls.map((url, imageIndex) =>
        this.processImage(url, `${proxyBoxId}_${imageIndex}`),
      ),
    );
  };
}

export { ImageManager };
