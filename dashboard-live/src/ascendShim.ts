// Ascend platform shim.
// The dashboard was built to call `window.ascend.runQuery(sql, { connection })`,
// a helper the Ascend web app injected at runtime. Ascend is gone, so we recreate
// that one function here, backed by static JSON snapshots exported from MotherDuck
// (see src/data/*.json). Each dashboard SQL query is a `SELECT * FROM <table> [ORDER BY ...]`,
// so we map the table name to its JSON file and replicate the ORDER BY.

const modules = import.meta.glob('./data/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Record<string, unknown>[]>;

const tables: Record<string, Record<string, unknown>[]> = {};
for (const path in modules) {
  const name = path.split('/').pop()!.replace(/\.json$/, '');
  tables[name] = modules[path];
}

type Order = { col: string; dir: 'asc' | 'desc' };

function parseOrderBy(sql: string): Order[] {
  const m = sql.match(/order\s+by\s+([\s\S]+?)(?:\blimit\b|;|$)/i);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((part) => {
      const tokens = part.trim().split(/\s+/);
      const col = (tokens[0] || '').replace(/["'`]/g, '');
      const dir = (tokens[1] || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
      return { col, dir } as Order;
    })
    .filter((o) => o.col);
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls last
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return String(a).localeCompare(String(b));
}

async function runQuery(sql: string): Promise<{ rows: Record<string, unknown>[] }> {
  const tableMatch = sql.match(/(dashboard\d+_[a-z0-9_]+)/i);
  const table = tableMatch?.[1];
  const source = (table && tables[table]) || [];
  const rows = source.slice();

  const order = parseOrderBy(sql);
  if (order.length) {
    rows.sort((ra, rb) => {
      for (const { col, dir } of order) {
        const r = compare(ra[col], rb[col]);
        if (r !== 0) return dir === 'desc' ? -r : r;
      }
      return 0;
    });
  }

  if (!table || !tables[table]) {
    // Surfaces a mismatch during development rather than silently drawing empty charts.
    console.warn('[ascendShim] no data found for query:', sql);
  }

  return { rows };
}

(window as unknown as { ascend: { runQuery: typeof runQuery } }).ascend = { runQuery };
