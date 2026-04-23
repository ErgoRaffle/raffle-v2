import { createRequire } from 'node:module';

/**
 * Filebase's package.json points ESM `import` at `./src`, where `NameManager` uses a
 * method named `import` — Node parses that as dynamic `import()` and throws.
 * Loading the published CJS bundle avoids that broken entry.
 */
const require = createRequire(import.meta.url);
const { ObjectManager } =
  require('@filebase/sdk') as typeof import('@filebase/sdk');

type FilebaseObjectManager = InstanceType<typeof ObjectManager>;

interface IpfsUploaderConfig {
  /** Filebase S3 API access key (from the Filebase dashboard) */
  accessKey: string;
  /** Filebase S3 API secret key */
  secretKey: string;
  /** Bucket name for IPFS-backed object storage */
  bucket: string;
}

class IpfsUploader {
  private objectManager: FilebaseObjectManager;

  /**
   * Creates and initializes an IpfsUploader with Filebase credentials.
   * @param config - Filebase S3 access key, secret, and bucket for uploads
   */
  constructor(config: IpfsUploaderConfig) {
    this.objectManager = new ObjectManager(config.accessKey, config.secretKey, {
      bucket: config.bucket,
    });
  }

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
