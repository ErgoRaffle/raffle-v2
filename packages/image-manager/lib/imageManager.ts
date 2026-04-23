import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import { downloadImage } from './imageDownloader';
import { IpfsUploader, IpfsUploaderConfig } from './ipfsUploader';

class ImageManager {
  private uploader: IpfsUploader;
  private logger: AbstractLogger;

  /**
   * Creates an ImageManager instance.
   * @param config - Filebase S3 access key, secret, and bucket for uploads
   * @param logger - Structured logger used for progress and errors
   */
  constructor(
    config: IpfsUploaderConfig,
    logger: AbstractLogger = new DummyLogger(),
  ) {
    this.uploader = new IpfsUploader(config);
    this.logger = logger;
  }

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
    this.logger.debug('starting image download phase');
    const imageBlobs = await Promise.all(
      urls.map(async (url) => {
        this.logger.debug(`ImageManager: downloading image from ${url}`);
        return downloadImage(url);
      }),
    );
    this.logger.debug(
      `download phase completed for ${imageBlobs.length} image(s), starting upload phase`,
    );

    return Promise.all(
      imageBlobs.map(async (imageBlob, imageIndex) => {
        const imageKey = `${proxyBoxId}_${imageIndex}`;
        this.logger.debug(`uploading "${imageKey}" (${imageBlob.size} bytes)`);
        const cid = await this.uploader.upload(imageBlob, imageKey);
        this.logger.info(`stored image on IPFS (cid=${cid}, key=${imageKey})`);
        return cid;
      }),
    );
  };
}

export { ImageManager };
