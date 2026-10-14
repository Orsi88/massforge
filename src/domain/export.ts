export type FieldCell = { k: string; key: string; v: string }
export type GeneratedItem = {
  tag: string
  tone: string
  rule: string
  checks: [string, string][]
  fields: FieldCell[]
  meta?: { first?: string; last?: string; age?: number | null; cidade?: string; uf?: string; fem?: boolean }
}

const DIAGNOSTIC_RULES = new Set(['unicos', 'incompativel', 'sem_campos', 'nao_se_aplica'])

export function splitDiagnostics(items: GeneratedItem[]) {
  const records: GeneratedItem[] = []
  const diagnostics: GeneratedItem[] = []
  for (const item of items) {
    if (DIAGNOSTIC_RULES.has(item.rule)) diagnostics.push(item)
    else records.push(item)
  }
  return { records, diagnostics }
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export function recordsToCsv(records: GeneratedItem[]) {
  const keys: string[] = []
  for (const record of records) {
    for (const field of record.fields) {
      if (!keys.includes(field.key)) keys.push(field.key)
    }
  }
  keys.push('regra_validacao', 'relacao_com_regra')
  const lines = [keys.map(escapeCsv).join(',')]
  for (const record of records) {
    const values = new Map(record.fields.map((field) => [field.key, field.v]))
    const row = keys.map((key) => {
      if (key === 'regra_validacao') return record.rule
      if (key === 'relacao_com_regra') return record.tag
      return values.get(key) ?? ''
    })
    lines.push(row.map(escapeCsv).join(','))
  }
  return `\uFEFF${lines.join('\r\n')}`
}

export function recordsToJson(records: GeneratedItem[]) {
  const payload = records.map((record) => {
    const row: Record<string, string> = {}
    for (const field of record.fields) row[field.key] = field.v
    row.regra_validacao = record.rule
    row.relacao_com_regra = record.tag
    return row
  })
  return JSON.stringify(payload, null, 2)
}

export function displayValue(value: string) {
  return value === '' ? '(vazio)' : value
}

export async function sha256(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const digest = await crypto.subtle.digest('SHA-256', copy)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
