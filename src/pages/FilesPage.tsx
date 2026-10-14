import { useMemo, useState } from 'react'
import { FAM, FILE_DEF, FILE_FIELDS, fileName } from '../domain/mfEngine.ts'
import { generateFiles, validateFileRequest, zipArtifacts, fmtBytes, folderPath, type FileArtifact, type FileRequest, type FolderMode } from '../domain/files.ts'
import { copyText, downloadBytes } from '../ui/browser.ts'
import { CopyButton } from '../ui/CopyButton.tsx'
import { FieldList, type EngineField } from '../ui/Fields.tsx'
import { SearchField } from '../ui/SearchField.tsx'

export function FilesPage({
  extension,
  onToast,
}: {
  extension?: string
  onToast: (message: string, bad?: boolean) => void
}) {
  const [selected, setSelected] = useState<string[]>(extension ? [extension.toUpperCase()] : ['PDF'])
  const [filter, setFilter] = useState('')
  const [config, setConfig] = useState<Record<string, unknown>>({ ...FILE_DEF, sel: extension ? [extension.toUpperCase()] : ['PDF'] })
  const [folderMode, setFolderMode] = useState<FolderMode>('familia')
  const [folderName, setFolderName] = useState('arquivos_teste')
  const [files, setFiles] = useState<FileArtifact[] | null>(null)
  const [busy, setBusy] = useState(false)
  const request = useMemo<FileRequest>(() => ({
    sel: selected,
    nome: String(config.nome || 'arquivo_teste'),
    nomeVar: String(config.nomeVar || 'Simples'),
    vazio: Boolean(config.vazio),
    tam: Number(config.tam ?? 1),
    unid: String(config.unid || 'MB'),
    conteudo: String(config.conteudo || 'Estrutura real'),
    real: String(config.real || 'PNG'),
    qtd: Number(config.qtd ?? 1),
    folderMode,
    folderName,
  }), [config, folderMode, folderName, selected])
  const error = validateFileRequest(request)
  const folded = filter.trim().toLocaleLowerCase('pt-BR').replace(/^\./, '')

  async function generate() {
    setBusy(true)
    try {
      const produced = await generateFiles(request, Math.floor(Math.random() * 1_000_000_000))
      setFiles(produced)
      onToast(`${produced.length} arquivo(s) prontos. O download ainda não foi iniciado.`)
    } catch (caught) {
      setFiles(null)
      onToast(caught instanceof Error ? caught.message : 'Falha ao gerar arquivos.', true)
    } finally {
      setBusy(false)
    }
  }

  const preview = selected.slice(0, 6).map((ext) => {
    const folder = folderPath(folderMode, folderName, ext)
    const filename = String(fileName({ ...FILE_DEF, ...request }, ext, request.qtd > 1 || selected.length > 1 ? '_1' : ''))
    return folder ? `${folder}/${filename}` : filename
  })

  return (
    <div className="work">
      <section className="step">
        <header className="step-title">
          <b>1</b>
          <h2>Selecione os tipos de extensão</h2>
        </header>
        <SearchField
          aria-label="Filtrar extensão"
          placeholder="Filtrar extensão"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <div className="group-grid">
          {FAM.map((family: { n: string; exts: string[] }) => {
            const exts = family.exts.filter((ext) => !folded || ext.toLocaleLowerCase('pt-BR').includes(folded))
            if (!exts.length) return null
            return (
              <div key={family.n}>
                <h3>{family.n}</h3>
                <div className="chips">
                  {exts.map((ext) => (
                    <button
                      key={ext}
                      type="button"
                      aria-pressed={selected.includes(ext)}
                      onClick={() => setSelected((current) => current.includes(ext) ? current.filter((item) => item !== ext) : [...current, ext])}
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <section className="step">
        <header className="step-title">
          <b>2</b>
          <h2>Defina as configurações e propriedades dos arquivos</h2>
        </header>
        <FieldList
          fields={FILE_FIELDS as EngineField[]}
          config={config}
          onChange={(name, value) => setConfig((current) => ({ ...current, [name]: value }))}
        />
      </section>
      <section className="step">
        <header className="step-title">
          <b>3</b>
          <h2>Defina e configure a estrutura e organização das pastas</h2>
        </header>
        <div className="fields">
          <label className="field">
            <span>Organização</span>
            <select value={folderMode} onChange={(event) => setFolderMode(event.target.value as FolderMode)}>
              <option value="raiz">Todos na raiz</option>
              <option value="unica">Uma pasta para todos</option>
              <option value="familia">Uma pasta por família</option>
              <option value="extensao">Uma pasta por extensão</option>
            </select>
          </label>
          {folderMode !== 'raiz' ? (
            <label className="field">
              <span>Pasta raiz</span>
              <input value={folderName} onChange={(event) => setFolderName(event.target.value)} />
            </label>
          ) : null}
        </div>
        <pre className="tree">{preview.length ? preview.join('\n') : 'Nenhuma extensão selecionada.'}</pre>
        {error ? <p className="banner bad">{error}</p> : null}
        <button id="mf-generate" className="primary" type="button" disabled={Boolean(error) || busy} onClick={generate}>
          {busy ? 'Gerando...' : 'Gerar arquivos'}
        </button>
      </section>
      <section className="panel" id="resultado">
        <h2>Arquivos</h2>
        {!files ? <p className="muted">Nenhum lote ainda. Escolha as extensões e gere.</p> : null}
        {files && (
          <>
            <p className="muted">{files.length} arquivo(s), {fmtBytes(files.reduce((sum, file) => sum + file.sizeBytes, 0))} no total.</p>
            <div className="list">
              {files.slice(0, 80).map((file) => (
                <article key={file.filename} className="card">
                  <span className="cell"><strong>{file.path}</strong><CopyButton label="Copiar caminho" onCopy={async () => { const ok = await copyText(file.path); onToast(ok ? 'Caminho copiado.' : 'Não foi possível copiar.', !ok) }} /></span>
                  <p><span className={`tone ${file.tone}`}>{file.tag}</span> {fmtBytes(file.sizeBytes)}</p>
                  <p className="muted">{file.description}</p>
                  <p className="mono">{file.checksum.slice(0, 16)}</p>
                  <button type="button" className="ghost" onClick={() => {
                    downloadBytes(file.filename, file.bytes, 'application/octet-stream')
                    onToast('Download iniciado. Isso não confirma que o arquivo foi salvo.')
                  }}>Baixar</button>
                </article>
              ))}
            </div>
            {files.length > 80 ? <p className="muted">A lista mostra 80 de {files.length}. O ZIP contém todos.</p> : null}
            <button type="button" className="primary" onClick={async () => {
              const zip = await zipArtifacts(files)
              downloadBytes('arquivos_teste.zip', zip, 'application/zip')
              onToast('Download do ZIP iniciado.')
            }}>Baixar ZIP</button>
          </>
        )}
      </section>
    </div>
  )
}
