export class SmartCache {
  private static readonly CACHE_KEY = 'whatdidisign_smart_cache';
  private static readonly MAX_CACHE_SIZE = 100;
  private static readonly CACHE_EXPIRY_HOURS = 24;

  static async get(url: string): Promise<any> {
    try {
      const result = await chrome.storage.local.get([this.CACHE_KEY]);
      const cache = result[this.CACHE_KEY] || {};
      
      const cached = cache[url];
      if (!cached) return null;
      
      // Check expiry
      const isExpired = Date.now() - cached.timestamp > (this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
      if (isExpired) {
        delete cache[url];
        await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
        return null;
      }
      
      // Update hit count and last accessed
      cached.hits++;
      cached.lastAccessed = Date.now();
      await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
      
      return cached.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set(url: string, data: any): Promise<void> {
    try {
      const result = await chrome.storage.local.get([this.CACHE_KEY]);
      let cache = result[this.CACHE_KEY] || {};
      
      // If cache is full, remove least recently used item
      const cacheKeys = Object.keys(cache);
      if (cacheKeys.length >= this.MAX_CACHE_SIZE) {
        const lruKey = cacheKeys.reduce((oldest, key) => {
          return (!cache[oldest] || cache[key].lastAccessed < cache[oldest].lastAccessed) ? key : oldest;
        });
        delete cache[lruKey];
      }
      
      cache[url] = {
        data,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        hits: 0
      };
      
      await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async clear(): Promise<void> {
    try {
      await chrome.storage.local.remove([this.CACHE_KEY]);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  static async getStats(): Promise<{totalEntries: number, totalHits: number}> {
    try {
      const result = await chrome.storage.local.get([this.CACHE_KEY]);
      const cache = result[this.CACHE_KEY] || {};
      
      const entries = Object.values(cache);
      return {
        totalEntries: entries.length,
        totalHits: entries.reduce((sum: number, entry: any) => sum + entry.hits, 0)
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { totalEntries: 0, totalHits: 0 };
    }
  }
}
