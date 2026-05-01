declare module 'lru-cache' {
  interface Options<K, V> {
    max?: number;
    maxSize?: number;
    maxAge?: number;
    ttl?: number;
    ttlResolution?: number;
    ttlAutopurge?: boolean;
    updateAgeOnGet?: boolean;
    updateAgeOnHas?: boolean;
    allowStale?: boolean;
    dispose?: (value: V, key: K) => void;
    disposeAfter?: (value: V, key: K) => void;
    noDisposeOnSet?: boolean;
    noUpdateTTL?: boolean;
    length?: (value: V, key?: K) => number;
    stale?: boolean;
  }

  export class LRUCache<K = string, V = any> {
    constructor(options?: Options<K, V> | number);
    set(key: K, value: V, options?: { ttl?: number }): this;
    get(key: K, options?: { updateAgeOnGet?: boolean }): V | undefined;
    peek(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    forEach(fn: (value: V, key: K, cache: LRUCache<K, V>) => void, thisp?: any): void;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;
    readonly size: number;
    readonly calculatedSize: number;
    dump(): Array<[K, { value: V; ttl?: number; size?: number }]>;
    load(arr: Array<[K, { value: V; ttl?: number; size?: number }]>): void;
  }

  export default LRUCache;
}
