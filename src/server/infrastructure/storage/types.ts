/**
 * Object storage abstraction.
 *
 * Charts and PDF files are binaries and must not live in PostgreSQL. Business
 * code only ever sees a storage key, never a vendor SDK.
 */

export interface StoredObject {
  key: string;
  contentType: string;
  sizeBytes: number;
}

export interface StorageProvider {
  readonly name: string;
  put(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
