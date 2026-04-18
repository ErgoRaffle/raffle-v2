import * as Client from '@storacha/client';
import { Signer } from '@storacha/client/principal/ed25519';
import * as Proof from '@storacha/client/proof';
import { StoreMemory } from '@storacha/client/stores/memory';

interface IpfsUploaderConfig {
  /** Ed25519 private key for the Storacha agent (base64-encoded) */
  key: string;
  /** UCAN delegation proof granting upload capabilities (base64-encoded) */
  proof: string;
}

class IpfsUploader {
  private client: Client.Client;

  private constructor(client: Client.Client) {
    this.client = client;
  }

  /**
   * Creates and initializes an IpfsUploader with the given Storacha credentials.
   * @param config - Key and proof for Storacha authentication
   * @returns Initialized IpfsUploader instance ready for uploads
   */
  static create = async (config: IpfsUploaderConfig): Promise<IpfsUploader> => {
    const principal = Signer.parse(config.key);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });

    const proof = await Proof.parse(config.proof);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());

    return new IpfsUploader(client);
  };

  /**
   * Uploads a Blob to IPFS via Storacha and returns the content CID.
   * @param data - The file data as a Blob
   * @param filename - The filename to use for the uploaded file
   * @returns The IPFS content identifier (CID) as a string
   */
  upload = async (data: Blob, filename: string): Promise<string> => {
    const file = new File([data], filename);
    const cid = await this.client.uploadFile(file);
    return cid.toString();
  };
}

export { IpfsUploader };
export type { IpfsUploaderConfig };
