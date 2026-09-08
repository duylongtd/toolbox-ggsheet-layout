import { promises as fs } from "node:fs";
import path from "node:path";
import type { StorageProvider, StoredObject } from "./types";

/**
 * Filesystem storage for local development and self hosted deployments.
 * Keys are sanitized so a key can never escape the configured root.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    const safe = key
      .split("/")
      .map((segment) => segment.replace(/[^A-Za-z0-9._-]/g, "_"))
      .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
      .join("/");
    const target = path.resolve(this.root, safe);
    const root = path.resolve(this.root);
    if (!target.startsWith(root + path.sep) && target !== root) {
      throw new Error("Resolved storage path is outside the storage root");
    }
    return target;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    return { key, contentType, sizeBytes: data.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}
