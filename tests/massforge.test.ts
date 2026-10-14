import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { generateCustom, validateCustom, customToJson } from '../src/domain/custom.ts'
import { buildDocument } from '../src/domain/documents.ts'
import { recordsToCsv, splitDiagnostics } from '../src/domain/export.ts'
import { generateFiles } from '../src/domain/files.ts'
import { ENG, rng, setReferenceDate } from '../src/domain/mfEngine.ts'

describe('geradores', () => {
  it('reproduz o CPF da especificação com a seed 4821', () => {
    setReferenceDate(new Date(2026, 9, 8))
    const item = ENG.cpf.one({ regra: 'DV correto', mask: 'Com máscara', uf: 'Qualquer', qtd: 1 }, rng(4821))
    expect(item.fields[0].v).toBe('107.321.469-92')
  })

  it('não mistura diagnóstico de unicidade nos registros exportados', () => {
    const items = ENG.numero.run({
      tipo: 'Inteiro', sinal: 'Qualquer', min: 1, max: 2, casas: '0', sep: 'Vírgula', milhar: false,
      regra: 'Aleatório no intervalo', ordem: 'Crescente', passo: 1, unicos: true, qtd: 5,
    }, rng(7))
    const split = splitDiagnostics(items)
    expect(split.records.length).toBeLessThanOrEqual(2)
    expect(split.diagnostics.some((item: { rule: string }) => item.rule === 'unicos')).toBe(true)
    expect(recordsToCsv(split.records)).not.toContain('limite de valores únicos')
  })
})

describe('boleto', () => {
  it('monta linha de 47 dígitos com DV Febraban', () => {
    setReferenceDate(new Date(2026, 9, 8))
    const item = ENG.boleto.one({
      banco: '001 · Banco do Brasil', vencimento: 'Futuro', regra: 'DV correto', mask: 'Só dígitos', qtd: 1,
    }, rng(4821))
    const linha = item.fields.find((field: { key: string }) => field.key === 'linha').v
    const bar = item.fields.find((field: { key: string }) => field.key === 'codigo_barras').v
    expect(linha).toMatch(/^\d{47}$/)
    expect(bar).toMatch(/^\d{44}$/)
    expect(bar.startsWith('0019')).toBe(true)
    const mod11 = (num: string) => {
      let sum = 0
      let weight = 2
      for (let i = num.length - 1; i >= 0; i--) {
        sum += Number(num[i]) * weight
        weight = weight === 9 ? 2 : weight + 1
      }
      const dv = 11 - (sum % 11)
      return dv === 0 || dv > 9 ? 1 : dv
    }
    expect(mod11(bar.slice(0, 4) + bar.slice(5))).toBe(Number(bar[4]))
    expect(item.fields.find((field: { key: string }) => field.key === 'payload').v).toContain('br.gov.bcb.pix')
  })
})

describe('massa personalizada', () => {
  it('bloqueia nome de coluna repetido', () => {
    const message = validateCustom([
      { id: '1', name: 'Nome', type: 'Nome', rule: 'Válido' },
      { id: '2', name: 'nome', type: 'E-mail', rule: 'Válido' },
    ], 2)
    expect(message).toMatch(/repetido/)
  })

  it('exporta os mesmos valores da prévia', () => {
    const columns = [{ id: '1', name: 'nome', type: 'Nome', rule: 'Válido' as const }]
    const records = generateCustom({
      columns,
      count: 3,
      seed: 99,
      referenceDate: new Date(2026, 9, 12),
      consistent: true,
    })
    const json = JSON.parse(customToJson(columns, records)) as { nome: string }[]
    expect(json.map((row) => row.nome)).toEqual(records.map((row) => row.values.nome))
  })
})

describe('arquivos e documentos', () => {
  it('gera arquivo vazio com zero bytes', async () => {
    const files = await generateFiles({
      sel: ['TXT'], nome: 'vazio', nomeVar: 'Simples', vazio: true, tam: 10, unid: 'KB',
      conteudo: 'Estrutura real', real: 'PNG', qtd: 1,
    }, 1)
    expect(files[0].sizeBytes).toBe(0)
  })

  it('respeita o tamanho do conteúdo simulado', async () => {
    const files = await generateFiles({
      sel: ['BIN'], nome: 'ruido', nomeVar: 'Simples', vazio: false, tam: 128, unid: 'B',
      conteudo: 'Simulado', real: 'PNG', qtd: 1,
    }, 4)
    expect(files[0].sizeBytes).toBe(128)
  })

  it('grava um docx que contém o título', async () => {
    const built = await buildDocument({
      format: 'Word',
      components: [{ id: '1', type: 'titulo', props: { texto: 'Relatorio de testes', nivel: 'H1' } }],
      meta: { nome: 'relatorio', titulo: 'Relatorio de testes', autor: 'QA', pagina: 'A4', orient: 'Retrato', conteudo: 'Normal' },
      seed: 1,
    })
    expect(built.bytes[0]).toBe(0x50)
    const zip = await JSZip.loadAsync(built.bytes)
    const xml = await zip.file('word/document.xml')?.async('string')
    expect(xml).toContain('Relatorio de testes')
  })

  it('grava uma planilha com a fórmula SOMA', async () => {
    const built = await buildDocument({
      format: 'Excel',
      components: [
        { id: 'aba', type: 'aba', props: { nome: 'Dados', linhas: 3, colunas: 2 } },
        { id: 'formula', type: 'formula', props: { func: 'SOMA', qtd: 3, erro: false } },
      ],
      meta: { nome: 'planilha', titulo: 'Planilha', autor: 'QA', pagina: 'A4', orient: 'Retrato', conteudo: 'Normal' },
      seed: 1,
    })
    const zip = await JSZip.loadAsync(built.bytes)
    const xml = await zip.file('xl/worksheets/sheet1.xml')?.async('string')
    expect(xml).toContain('SUM(')
  })

  it('recusa PROCV sem a aba Resumo', async () => {
    await expect(buildDocument({
      format: 'Excel',
      components: [{ id: 'formula', type: 'formula', props: { func: 'PROCV', qtd: 1, erro: false } }],
      meta: { nome: 'planilha', titulo: 'Planilha', autor: 'QA', pagina: 'A4', orient: 'Retrato', conteudo: 'Normal' },
      seed: 1,
    })).rejects.toThrow(/Resumo/)
  })

  it('abre o PDF gerado', async () => {
    const built = await buildDocument({
      format: 'PDF',
      components: [{ id: '1', type: 'titulo', props: { texto: 'Relatorio de testes', nivel: 'H1' } }],
      meta: { nome: 'relatorio', titulo: 'Relatorio de testes', autor: 'QA', pagina: 'A4', orient: 'Retrato', conteudo: 'Normal' },
      seed: 1,
    })
    const pdf = await PDFDocument.load(built.bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(0)
  })
})
