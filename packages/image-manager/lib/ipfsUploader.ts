import { ObjectManager } from '@filebase/sdk';

interface IpfsUploaderConfig {
  /** Filebase S3 API access key (from the Filebase dashboard) */
  accessKey: string;
  /** Filebase S3 API secret key */
  secretKey: string;
  /** Bucket name for IPFS-backed object storage */
  bucket: string;
}

class IpfsUploader {
  private objectManager: ObjectManager;

  private constructor(objectManager: ObjectManager) {
    this.objectManager = objectManager;
  }

  /**
   * Creates and initializes an IpfsUploader with Filebase credentials.
   * @param config - Filebase S3 access key, secret, and bucket for uploads
   * @returns Initialized IpfsUploader instance ready for uploads
   */
  static create = async (config: IpfsUploaderConfig): Promise<IpfsUploader> => {
    const objectManager = new ObjectManager(
      config.accessKey,
      config.secretKey,
      {
        bucket: config.bucket,
      },
    );
    return new IpfsUploader(objectManager);
  };

  /**
   * Uploads a Blob to IPFS via Filebase and returns the content CID.
   * @param data - The file data as a Blob
   * @param filename - The object key / filename to use for the uploaded file
   * @returns The IPFS content identifier (CID) as a string
   */
  upload = async (data: Blob, filename: string): Promise<string> => {
    const buffer = Buffer.from(await data.arrayBuffer());
    const uploaded = await this.objectManager.upload(
      filename,
      buffer,
      undefined,
      undefined,
    );
    return uploaded.cid;
  };
}

export { IpfsUploader };
export type { IpfsUploaderConfig };
