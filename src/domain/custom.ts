import { cpfD, ctVal, fmtCpf, int, person, rng, setReferenceDate } from './mfEngine.ts'

export const COLUMN_TYPES = [
  'Nome completo', 'Nome', 'Sobrenome', 'CPF', 'CNPJ', 'E-mail', 'Telefone', 'CEP', 'Endereço',
  'Cidade', 'UF', 'Data de nascimento', 'Idade', 'Data', 'Data e hora', 'Número inteiro', 'Decimal',
  'Valor monetário', 'Porcentagem', 'Booleano', 'Status', 'Texto curto', 'Código (AAA-9999)',
  'Cartão', 'Chave PIX', 'Conta bancária', 'UUID',
] as const

export type ColumnRule = 'Válido' | 'Inválido' | 'Misto'
export type CustomColumn = { id: string; name: string; type: string; rule: ColumnRule }
export type CustomRow = { values: Record<string, string>; checks: Record<string, 'passa' | 'falha'> }

const MAX_ROWS = 10000

export function validateCustom(columns: CustomColumn[], count: number) {
  if (columns.length === 0) return 'Inclua ao menos uma coluna.'
  if (!Number.isInteger(count) || count < 1 || count > MAX_ROWS) {
    return `A quantidade precisa ser um inteiro de 1 a ${MAX_ROWS}.`
  }
  const seen = new Set<string>()
  for (const column of columns) {
    const name = column.name.trim()
    if (!name) return 'Toda coluna precisa de um nome.'
    if (!column.type) return `A coluna "${name}" está sem tipo.`
    const folded = name.toLocaleLowerCase('pt-BR')
    if (seen.has(folded)) return `O nome "${name}" está repetido. JSON não pode perder uma coluna por sobrescrita.`
    seen.add(folded)
  }
  return null
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function birthFor(random: () => number, today: Date) {
  const age = int(random, 18, 80)
  const date = new Date(today.getFullYear() - age, today.getMonth(), today.getDate())
  date.setDate(date.getDate() - int(random, 0, 364))
  let years = today.getFullYear() - date.getFullYear()
  const anniversary = new Date(today.getFullYear(), date.getMonth(), date.getDate())
  if (today < anniversary) years -= 1
  const label = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
  return { label, age: years }
}

function consistentCell(
  column: CustomColumn,
  random: () => number,
  individual: ReturnType<typeof person>,
  birth: { label: string; age: number },
  linkBirth: boolean,
) {
  if (column.rule !== 'Válido') return null
  switch (column.type) {
    case 'Nome completo':
      return individual.nome
    case 'Nome':
      return individual.first
    case 'Sobrenome':
      return individual.last
    case 'E-mail':
      return individual.email
    case 'Telefone':
      return individual.tel
    case 'CEP':
      return individual.cep
    case 'Endereço':
      return `${individual.rua}, ${individual.numero} – ${individual.bairro}`
    case 'Cidade':
      return individual.cidade
    case 'UF':
      return individual.uf
    case 'CPF':
      return fmtCpf(cpfD(random, individual.uf).join(''), true)
    case 'Data de nascimento':
      return linkBirth ? birth.label : null
    case 'Idade':
      return linkBirth ? String(birth.age) : null
    default:
      return null
  }
}

export function generateCustom(options: {
  columns: CustomColumn[]
  count: number
  seed: number
  referenceDate: Date
  consistent: boolean
}) {
  setReferenceDate(options.referenceDate)
  const random = rng(options.seed)
  const linkBirth = options.consistent
    && options.columns.some((column) => column.type === 'Data de nascimento' && column.rule === 'Válido')
    && options.columns.some((column) => column.type === 'Idade' && column.rule === 'Válido')
  const records: CustomRow[] = []
  for (let index = 0; index < options.count; index += 1) {
    const individual = person(random, {})
    const birth = birthFor(random, options.referenceDate)
    const values: Record<string, string> = {}
    const checks: Record<string, 'passa' | 'falha'> = {}
    for (const column of options.columns) {
      const linked = options.consistent
        ? consistentCell(column, random, individual, birth, linkBirth)
        : null
      if (linked !== null) {
        values[column.name] = linked
        checks[column.name] = 'passa'
      } else {
        const cell = ctVal(column.type, column.rule, random, individual)
        values[column.name] = String(cell.t)
        checks[column.name] = cell.bad ? 'falha' : 'passa'
      }
    }
    records.push({ values, checks })
  }
  return records
}

export function customToCsv(columns: CustomColumn[], records: CustomRow[]) {
  const headers = [
    ...columns.map((column) => column.name),
    ...columns.map((column) => `check_${column.name}`),
  ]
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(',')]
  for (const record of records) {
    const row = [
      ...columns.map((column) => record.values[column.name] ?? ''),
      ...columns.map((column) => record.checks[column.name] ?? ''),
    ]
    lines.push(row.map(escape).join(','))
  }
  return `\uFEFF${lines.join('\r\n')}`
}

export function customToJson(columns: CustomColumn[], records: CustomRow[]) {
  const payload = records.map((record) => {
    const row: Record<string, string> = {}
    for (const column of columns) {
      row[column.name] = record.values[column.name] ?? ''
      row[`check_${column.name}`] = record.checks[column.name] ?? ''
    }
    return row
  })
  return JSON.stringify(payload, null, 2)
}
