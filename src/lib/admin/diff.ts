// Field-level diff for the audit log viewer (step 7.6).
export interface DiffEntry {
  path: string;
  before: unknown;
  after: unknown;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function diffValues(before: unknown, after: unknown, path = '', depth = 0): DiffEntry[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (depth < 4 && isObj(before) && isObj(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((k) => diffValues(before[k], after[k], path ? `${path}.${k}` : k, depth + 1));
  }
  if (depth < 4 && isObj(after) && (before === null || before === undefined)) {
    return Object.keys(after)
      .sort()
      .map((k) => ({ path: path ? `${path}.${k}` : k, before: undefined, after: after[k] }));
  }
  if (depth < 4 && isObj(before) && (after === null || after === undefined)) {
    return Object.keys(before)
      .sort()
      .map((k) => ({ path: path ? `${path}.${k}` : k, before: before[k], after: undefined }));
  }
  return [{ path: path || '(value)', before, after }];
}
