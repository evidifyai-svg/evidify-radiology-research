// performance.ts
// Frontend performance utilities
// Sprint 4 - Performance Optimization

import { invoke } from '@tauri-apps/api/tauri';

// ============================================
// Types
// ============================================

export interface PaginationRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CacheStats {
  entries: number;
  maxEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface MemoryStats {
  heapUsedMb: number;
  rssMb: number;
  cacheEntries: number;
  pendingTasks: number;
}

export interface PerformanceStats {
  cache: CacheStats;
  memory: MemoryStats;
  pendingBackgroundTasks: number;
}

// ============================================
// Frontend Cache
// ============================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttlMs: number;
}

/**
 * Simple in-memory cache with TTL for frontend
 */
export class FrontendCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTtlMs: number;

  constructor(maxSize = 100, defaultTtlMs = 30000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.timestamp + entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

// Global cache instance
export const appCache = new FrontendCache(200, 60000);

// ============================================
// Debounce & Throttle
// ============================================

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = limitMs - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

// ============================================
// Lazy Loading
// ============================================

/**
 * Load items lazily with intersection observer
 */
export function createLazyLoader<T>(
  loadFn: (page: number) => Promise<PaginatedResponse<T>>,
  options: {
    pageSize?: number;
    threshold?: number;
    onLoad?: (items: T[]) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { pageSize = 50, threshold = 0.5, onLoad, onError } = options;

  let currentPage = 1;
  let isLoading = false;
  let hasMore = true;
  let observer: IntersectionObserver | null = null;

  async function loadNext(): Promise<T[]> {
    if (isLoading || !hasMore) return [];

    isLoading = true;
    try {
      const response = await loadFn(currentPage);
      hasMore = response.hasNext;
      currentPage++;
      onLoad?.(response.data);
      return response.data;
    } catch (e) {
      onError?.(e as Error);
      return [];
    } finally {
      isLoading = false;
    }
  }

  function observe(element: Element): void {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          loadNext();
        }
      },
      { threshold }
    );

    observer.observe(element);
  }

  function reset(): void {
    currentPage = 1;
    hasMore = true;
    isLoading = false;
  }

  function disconnect(): void {
    observer?.disconnect();
    observer = null;
  }

  return { loadNext, observe, reset, disconnect, getState: () => ({ isLoading, hasMore, currentPage }) };
}

// ============================================
// Virtual List
// ============================================

export interface VirtualListConfig {
  itemHeight: number;
  overscan?: number;
  containerHeight: number;
}

export interface VirtualListState {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  visibleCount: number;
}

/**
 * Calculate virtual list state for large lists
 */
export function calculateVirtualList(
  totalItems: number,
  scrollTop: number,
  config: VirtualListConfig
): VirtualListState {
  const { itemHeight, overscan = 5, containerHeight } = config;

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems,
    startIndex + visibleCount + overscan * 2
  );
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY, visibleCount };
}

// ============================================
// Request Batching
// ============================================

type BatchedRequest<T> = {
  id: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

/**
 * Batch multiple requests into a single call
 */
export function createRequestBatcher<T>(
  batchFn: (ids: string[]) => Promise<Map<string, T>>,
  options: { maxBatchSize?: number; delayMs?: number } = {}
) {
  const { maxBatchSize = 50, delayMs = 10 } = options;

  let pending: BatchedRequest<T>[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  async function flush(): Promise<void> {
    if (pending.length === 0) return;

    const batch = pending.splice(0, maxBatchSize);
    const ids = batch.map((r) => r.id);

    try {
      const results = await batchFn(ids);
      for (const req of batch) {
        const result = results.get(req.id);
        if (result !== undefined) {
          req.resolve(result);
        } else {
          req.reject(new Error(`No result for ${req.id}`));
        }
      }
    } catch (e) {
      for (const req of batch) {
        req.reject(e as Error);
      }
    }

    // Continue flushing if more pending
    if (pending.length > 0) {
      flush();
    }
  }

  function request(id: string): Promise<T> {
    return new Promise((resolve, reject) => {
      pending.push({ id, resolve, reject });

      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          timeoutId = null;
          flush();
        }, delayMs);
      }

      if (pending.length >= maxBatchSize) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        flush();
      }
    });
  }

  return { request };
}

// ============================================
// Memoization
// ============================================

/**
 * Memoize expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: { maxSize?: number; keyFn?: (...args: Parameters<T>) => string } = {}
): T {
  const { maxSize = 100, keyFn } = options;
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);

    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  }) as T;
}

// ============================================
// Performance Monitoring
// ============================================

export interface PerformanceMetrics {
  renderTime: number;
  apiLatency: number;
  memoryUsage: number | null;
}

/**
 * Track component render time
 */
export function measureRender(label: string): () => number {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    if (duration > 16) {
      // > 1 frame at 60fps
      console.warn(`[Perf] ${label}: ${duration.toFixed(2)}ms (slow render)`);
    }
    return duration;
  };
}

/**
 * Track API call latency
 */
export async function measureApi<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    if (duration > 500) {
      console.warn(`[Perf] ${label}: ${duration.toFixed(2)}ms (slow API)`);
    }
    return result;
  } catch (e) {
    const duration = performance.now() - start;
    console.error(`[Perf] ${label}: failed after ${duration.toFixed(2)}ms`);
    throw e;
  }
}

// ============================================
// Backend Performance API
// ============================================

/**
 * Get performance stats from backend
 */
export async function getPerformanceStats(): Promise<PerformanceStats> {
  return invoke('get_performance_stats');
}

/**
 * Clear backend caches
 */
export async function clearBackendCaches(): Promise<void> {
  return invoke('clear_caches');
}

/**
 * Trigger database optimization
 */
export async function optimizeDatabase(): Promise<void> {
  return invoke('optimize_database');
}

/**
 * Get notes with pagination
 */
export async function getNotesPaginated(
  page: number,
  pageSize: number,
  clientId?: string
): Promise<PaginatedResponse<any>> {
  return invoke('get_notes_paginated', { page, pageSize, clientId });
}

// ============================================
// React Hooks (for use in components)
// ============================================

/**
 * Custom hook for paginated data loading
 * Use in React component:
 * 
 * const { data, loading, error, loadMore, hasMore } = usePagination(
 *   (page) => getNotesPaginated(page, 50),
 *   { pageSize: 50 }
 * );
 */
export function createPaginationState<T>() {
  return {
    data: [] as T[],
    page: 1,
    pageSize: 50,
    totalCount: 0,
    loading: false,
    error: null as Error | null,
    hasMore: true,
  };
}

// ============================================
// Exports
// ============================================

export default {
  // Cache
  FrontendCache,
  appCache,
  
  // Timing
  debounce,
  throttle,
  
  // Loading
  createLazyLoader,
  calculateVirtualList,
  
  // Batching
  createRequestBatcher,
  
  // Memoization
  memoize,
  
  // Monitoring
  measureRender,
  measureApi,
  
  // Backend API
  getPerformanceStats,
  clearBackendCaches,
  optimizeDatabase,
  getNotesPaginated,
};
