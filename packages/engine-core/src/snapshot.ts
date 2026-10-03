/**
 * **The fold's state as bytes, and back** (plan-scaling.md Stage 3): the
 * encoding a snapshot is written in. A snapshot is a cache of the fold, never
 * a truth of its own (the plan's invariant 1), so this file promises one thing
 * and refuses everything it cannot promise: **decode(encode(x)) is x**, object
 * graph and all.
 *
 * - **Plain data only**: primitives, arrays, plain objects, `Map` and `Set`.
 *   Anything else — a class instance, a function, an accessor property, a
 *   symbol key, a bigint — throws at encode, naming where it was found. A fold
 *   field that grows a shape this file cannot carry stops the snapshot being
 *   written; it never writes a snapshot that would restore wrong.
 * - **Shared references survive.** The fold keeps one comparison in its list
 *   and in each of its candidates' buckets, and mutates records in place, so
 *   an object reached twice is written once and referred to after.
 * - **The values JSON loses are kept**: `undefined` (as a property, which
 *   keeps the key and its order), `-0`, `NaN` and the infinities — the engine
 *   starts its clock at `-Infinity`.
 * - **Order is kept**: a Map's and a Set's insertion order and an object's key
 *   order, because the fold's readers iterate them and replay is bit-identical.
 *
 * Pure and dependency-free like the rest of the package; JSON-safe output, so
 * a store writes it as text.
 */

type Enc =
  | string | boolean | null | number
  | { $n: 'NaN' | 'Infinity' | '-Infinity' | '-0' }
  | { $u: 1 }
  | { $r: number }
  | { $id: number; $a: Enc[] }
  | { $id: number; $o: Record<string, Enc> }
  | { $id: number; $m: Array<[Enc, Enc]> }
  | { $id: number; $s: Enc[] };

/** Why a value could not be encoded, with the path that reached it. */
export class SnapshotShapeError extends Error {
  constructor(path: string, what: string) {
    super(`snapshot: ${what} at ${path} — the fold's state must be plain data`);
    this.name = 'SnapshotShapeError';
  }
}

export function encodeState(value: unknown): Enc {
  const ids = new Map<object, number>();
  const walk = (v: unknown, path: string): Enc => {
    if (v === null) return null;
    switch (typeof v) {
      case 'string': case 'boolean': return v;
      case 'undefined': return { $u: 1 };
      case 'number':
        if (Number.isNaN(v)) return { $n: 'NaN' };
        if (v === Infinity) return { $n: 'Infinity' };
        if (v === -Infinity) return { $n: '-Infinity' };
        if (Object.is(v, -0)) return { $n: '-0' };
        return v;
      case 'object': break;
      default: throw new SnapshotShapeError(path, `a ${typeof v}`);
    }
    const o = v as object;
    const seen = ids.get(o);
    if (seen !== undefined) return { $r: seen };
    const id = ids.size;
    ids.set(o, id);
    if (Array.isArray(o)) {
      if (Object.getPrototypeOf(o) !== Array.prototype) throw new SnapshotShapeError(path, 'an array subclass');
      const out: Enc[] = [];
      for (let i = 0; i < o.length; i++) {
        if (!(i in o)) throw new SnapshotShapeError(`${path}[${i}]`, 'a hole');
        out.push(walk(o[i], `${path}[${i}]`));
      }
      if (Object.keys(o).length !== o.length) throw new SnapshotShapeError(path, 'an array with extra keys');
      return { $id: id, $a: out };
    }
    if (o instanceof Map) {
      if (Object.getPrototypeOf(o) !== Map.prototype) throw new SnapshotShapeError(path, 'a Map subclass');
      const out: Array<[Enc, Enc]> = [];
      for (const [k, x] of o) out.push([walk(k, `${path}<key>`), walk(x, `${path}.get(${String(k)})`)]);
      return { $id: id, $m: out };
    }
    if (o instanceof Set) {
      if (Object.getPrototypeOf(o) !== Set.prototype) throw new SnapshotShapeError(path, 'a Set subclass');
      const out: Enc[] = [];
      for (const x of o) out.push(walk(x, `${path}<item>`));
      return { $id: id, $s: out };
    }
    const proto = Object.getPrototypeOf(o);
    if (proto !== Object.prototype && proto !== null) {
      throw new SnapshotShapeError(path, `an instance of ${(proto as { constructor?: { name?: string } })
        .constructor?.name ?? 'a class'}`);
    }
    if (proto === null) throw new SnapshotShapeError(path, 'a null-prototype object');
    if (Object.getOwnPropertySymbols(o).length > 0) throw new SnapshotShapeError(path, 'a symbol key');
    // a frozen object is most likely a module's constant, whose identity a
    // copy would not keep
    if (Object.isFrozen(o)) throw new SnapshotShapeError(path, 'a frozen object');
    const out: Record<string, Enc> = {};
    for (const k of Object.getOwnPropertyNames(o)) {
      const d = Object.getOwnPropertyDescriptor(o, k)!;
      if (!('value' in d)) throw new SnapshotShapeError(`${path}.${k}`, 'an accessor property');
      if (!d.enumerable) throw new SnapshotShapeError(`${path}.${k}`, 'a non-enumerable property');
      // defined, never assigned: a key named `__proto__` must stay a key
      Object.defineProperty(out, k, { value: walk(d.value, `${path}.${k}`), enumerable: true,
        writable: true, configurable: true });
    }
    return { $id: id, $o: out };
  };
  return walk(value, '$');
}

export function decodeState(enc: unknown): unknown {
  const byId = new Map<number, unknown>();
  const walk = (e: unknown): unknown => {
    if (e === null || typeof e !== 'object') return e;
    const x = e as Record<string, unknown>;
    if ('$n' in x) {
      switch (x.$n) {
        case 'NaN': return NaN;
        case 'Infinity': return Infinity;
        case '-Infinity': return -Infinity;
        case '-0': return -0;
        default: throw new Error(`snapshot: unknown number ${String(x.$n)}`);
      }
    }
    if ('$u' in x) return undefined;
    if ('$r' in x) {
      if (!byId.has(x.$r as number)) throw new Error(`snapshot: a reference to ${String(x.$r)} before it`);
      return byId.get(x.$r as number);
    }
    const id = x.$id as number;
    if ('$a' in x) {
      const out: unknown[] = [];
      byId.set(id, out);
      for (const i of x.$a as unknown[]) out.push(walk(i));
      return out;
    }
    if ('$m' in x) {
      const out = new Map<unknown, unknown>();
      byId.set(id, out);
      for (const [k, v] of x.$m as Array<[unknown, unknown]>) out.set(walk(k), walk(v));
      return out;
    }
    if ('$s' in x) {
      const out = new Set<unknown>();
      byId.set(id, out);
      for (const i of x.$s as unknown[]) out.add(walk(i));
      return out;
    }
    if ('$o' in x) {
      const out: Record<string, unknown> = {};
      byId.set(id, out);
      for (const [k, v] of Object.entries(x.$o as Record<string, unknown>)) {
        // a key named `__proto__` must be a key, never a prototype
        Object.defineProperty(out, k, { value: walk(v), enumerable: true, writable: true,
          configurable: true });
      }
      return out;
    }
    throw new Error('snapshot: an unknown node');
  };
  return walk(enc);
}
