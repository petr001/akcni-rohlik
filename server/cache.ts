import { mkdir, readFile, writeFile } from 'node:fs/promises'

/** Úložiště cache – na Vercelu nahraď sdíleným (Vercel Blob / KV / Edge Config). */
export interface Cache {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown): Promise<void>
}

class FileCache implements Cache {
  private dir = new URL('../data/', import.meta.url)
  async get<T>(key: string) {
    try {
      return JSON.parse(await readFile(new URL(`${key}.json`, this.dir), 'utf8')) as T
    } catch {
      return null
    }
  }
  async set(key: string, value: unknown) {
    await mkdir(this.dir, { recursive: true })
    await writeFile(new URL(`${key}.json`, this.dir), JSON.stringify(value))
  }
}

/** Jen pro jednu instanci funkce – na Vercelu NENÍ sdílená, slouží jako náhrada do doby, než vznikne adaptér. */
class MemoryCache implements Cache {
  private m = new Map<string, unknown>()
  async get<T>(key: string) {
    return (this.m.get(key) as T) ?? null
  }
  async set(key: string, value: unknown) {
    this.m.set(key, value)
  }
}

export const cache: Cache = process.env.VERCEL ? new MemoryCache() : new FileCache()
