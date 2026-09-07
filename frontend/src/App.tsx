import { useState, FormEvent, useRef } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  Upload,
} from 'lucide-react';

const API_BASE = 'http://localhost:3333';

type Verdict = 'CONFIAVEL' | 'DUVIDOSO' | 'FALSO' | 'SEM_DADOS_SUFICIENTES';
type Mode = 'text' | 'image' | 'video';

interface FactCheckMatch {
  publisher: string;
  claimReviewed: string;
  textualRating: string;
  sourceUrl: string;
}

interface SourceCheck {
  domain: string;
  trustScore: number;
  category: string | null;
}

interface MediaAnalysis {
  hasExifEdit: boolean | null;
  elaAnomalyScore: number | null;
}

interface CheckResult {
  mediaType: 'TEXT_LINK' | 'IMAGE' | 'VIDEO';
  score: number;
  verdict: Verdict;
  summary: string;
  extractedClaim?: string | null;
  sourceCheck?: SourceCheck | null;
  factCheck?: FactCheckMatch[];
  mediaAnalysis?: MediaAnalysis | null;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  CONFIAVEL: 'Confiável',
  DUVIDOSO: 'Duvidoso',
  FALSO: 'Falso',
  SEM_DADOS_SUFICIENTES: 'Sem dados suficientes',
};

const VERDICT_COLOR: Record<Verdict, string> = {
  CONFIAVEL: '#34D399',
  DUVIDOSO: '#FBBF24',
  FALSO: '#F2545B',
  SEM_DADOS_SUFICIENTES: '#8CA0C4',
};

const VERDICT_ICON: Record<Verdict, typeof CheckCircle2> = {
  CONFIAVEL: CheckCircle2,
  DUVIDOSO: AlertTriangle,
  FALSO: XCircle,
  SEM_DADOS_SUFICIENTES: HelpCircle,
};

const MODE_CONFIG: Record<Mode, { label: string; icon: typeof FileText }> = {
  text: { label: 'Texto / Link', icon: FileText },
  image: { label: 'Imagem', icon: ImageIcon },
  video: { label: 'Vídeo', icon: Video },
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const color = VERDICT_COLOR[verdict];
  const Icon = VERDICT_ICON[verdict];
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full pl-3 pr-4 py-2 text-sm font-semibold"
      style={{
        color,
        backgroundColor: `${color}17`,
        boxShadow: `0 0 32px -8px ${color}99`,
        border: `1px solid ${color}40`,
      }}
    >
      <Icon size={18} strokeWidth={2.25} />
      {VERDICT_LABEL[verdict]}
    </div>
  );
}

function ScoreBar({ score, verdict }: { score: number; verdict: Verdict }) {
  const color = VERDICT_COLOR[verdict];
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-navy-700/80 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 14px ${color}` }}
        />
      </div>
      <span className="font-semibold text-sm text-ink-100 w-16 text-right tabular-nums">
        {score}
        <span className="text-ink-500 font-normal">/100</span>
      </span>
    </div>
  );
}

function RatingChip({ rating }: { rating: string }) {
  const lower = rating.toLowerCase();
  const isNegative = /falso|enganoso|distorcido|exagerado|sem evid/.test(lower);
  const isPositive = /verdadeiro|correto|confirmado/.test(lower);
  const color = isNegative ? '#F2545B' : isPositive ? '#34D399' : '#8CA0C4';
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded-md"
      style={{ color, backgroundColor: `${color}1A` }}
    >
      {rating}
    </span>
  );
}

function ModeSwitcher({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="inline-flex gap-1 rounded-xl bg-navy-800/60 border border-navy-600 p-1 mb-6">
      {(Object.keys(MODE_CONFIG) as Mode[]).map((key) => {
        const { label, icon: Icon } = MODE_CONFIG[key];
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active ? 'bg-accent-500 text-white' : 'text-ink-400 hover:text-ink-100'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>('text');
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setResult(null);
    setError(null);
    setFile(null);
    setInput('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response: Response;

      if (mode === 'text') {
        const trimmed = input.trim();
        if (!trimmed) {
          setLoading(false);
          return;
        }
        const isUrl = /^https?:\/\//i.test(trimmed);
        response = await fetch(`${API_BASE}/api/factcheck`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isUrl ? { url: trimmed } : { text: trimmed }),
        });
      } else {
        if (!file) {
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append(mode === 'image' ? 'image' : 'video', file);
        response = await fetch(`${API_BASE}/api/${mode === 'image' ? 'image-check' : 'video-check'}`, {
          method: 'POST',
          body: formData,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Não foi possível concluir a apuração.');
      }

      setResult(data.result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao conectar com o servidor. Confirme se a API está rodando em localhost:3333.'
      );
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = mode === 'text' ? input.trim().length > 0 : file !== null;

  return (
    <div className="min-h-screen bg-navy-950 text-ink-100 font-sans relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-56 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(61,139,255,0.5) 0%, rgba(61,139,255,0) 65%)' }}
      />
      <div
        className="pointer-events-none absolute top-96 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.4) 0%, rgba(52,211,153,0) 70%)' }}
      />

      <div className="relative max-w-[640px] mx-auto px-6 py-20">
        <header className="mb-10 text-center">
          <h1 className="text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-white via-white to-accent-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(79,141,255,0.35)]">
            Verifica
          </h1>
          <p className="text-ink-400 text-lg">Investigue antes de compartilhar.</p>
        </header>

        <div className="flex justify-center">
          <ModeSwitcher mode={mode} onChange={switchMode} />
        </div>

        <form onSubmit={handleSubmit} className="mb-10">
          {mode === 'text' ? (
            <div className="rounded-2xl bg-navy-800/70 border border-navy-600 p-2 flex gap-2 shadow-card backdrop-blur-xl focus-within:border-accent-400/60 transition-colors">
              <div className="flex items-center pl-3 text-ink-500">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Cole um link ou digite o que quer apurar…"
                className="flex-1 bg-transparent text-ink-100 placeholder:text-ink-500 rounded-xl px-2 py-3 outline-none"
              />
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="bg-gradient-to-b from-accent-400 to-accent-500 text-white px-6 py-3 rounded-xl font-semibold hover:brightness-110 active:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_24px_-4px_rgba(47,111,237,0.65)]"
              >
                {loading ? 'Apurando…' : 'Apurar'}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-navy-800/70 border border-navy-600 p-6 shadow-card backdrop-blur-xl">
              <input
                ref={fileInputRef}
                type="file"
                accept={mode === 'image' ? 'image/*' : 'video/*'}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-navy-600 hover:border-accent-400/60 rounded-xl py-10 transition-colors"
              >
                <Upload size={28} className="text-accent-300" />
                <span className="text-ink-100 font-medium">
                  {file ? file.name : `Clique pra escolher ${mode === 'image' ? 'uma imagem' : 'um vídeo'}`}
                </span>
                {!file && (
                  <span className="text-ink-500 text-sm">
                    {mode === 'image' ? 'JPG, PNG — até 15MB' : 'MP4, MOV — até 80MB'}
                  </span>
                )}
              </button>
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full mt-4 bg-gradient-to-b from-accent-400 to-accent-500 text-white px-6 py-3 rounded-xl font-semibold hover:brightness-110 active:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_24px_-4px_rgba(47,111,237,0.65)]"
              >
                {loading ? 'Analisando…' : 'Analisar'}
              </button>
            </div>
          )}
        </form>

        {error && (
          <div className="border border-stamp-falso/30 bg-stamp-falso/10 text-ink-100 rounded-xl px-4 py-3 mb-8 text-sm animate-riseIn">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-3xl bg-gradient-to-b from-navy-800/70 to-navy-800/40 border border-navy-600 backdrop-blur-xl p-9 shadow-card animate-riseIn">
            <div className="flex items-start justify-between gap-4 mb-6">
              <VerdictBadge verdict={result.verdict} />
            </div>

            {result.extractedClaim && (
              <p className="text-xs text-ink-500 mb-5">
                Alegação identificada:{' '}
                <span className="text-ink-400 italic">"{result.extractedClaim}"</span>
              </p>
            )}

            <ScoreBar score={result.score} verdict={result.verdict} />

            <p
              className="mt-6 text-ink-100/90 leading-relaxed pl-4 py-0.5"
              style={{ borderLeft: `2px solid ${VERDICT_COLOR[result.verdict]}66` }}
            >
              {result.summary}
            </p>

            {result.sourceCheck && (
              <div className="mt-7 pt-6 border-t border-navy-600/80 flex items-center justify-between text-sm">
                <span className="text-ink-400">
                  Fonte:{' '}
                  <span className="text-ink-100 font-medium">{result.sourceCheck.domain}</span>
                  {result.sourceCheck.category && ` · ${result.sourceCheck.category}`}
                </span>
                <span className="text-ink-400">
                  Credibilidade:{' '}
                  <span className="text-ink-100 font-medium">{result.sourceCheck.trustScore}/100</span>
                </span>
              </div>
            )}

            {result.mediaAnalysis && (
              <div className="mt-7 pt-6 border-t border-navy-600/80 flex items-center justify-between text-sm">
                <span className="text-ink-400">
                  Metadados editados:{' '}
                  <span className="text-ink-100 font-medium">
                    {result.mediaAnalysis.hasExifEdit ? 'Sim' : 'Não detectado'}
                  </span>
                </span>
                {result.mediaAnalysis.elaAnomalyScore !== null && (
                  <span className="text-ink-400">
                    Anomalia ELA:{' '}
                    <span className="text-ink-100 font-medium">
                      {result.mediaAnalysis.elaAnomalyScore}/100
                    </span>
                  </span>
                )}
              </div>
            )}

            {result.factCheck && result.factCheck.length > 0 && (
              <div className="mt-7 pt-6 border-t border-navy-600/80">
                <p className="text-sm text-ink-400 mb-4">
                  Checagens encontradas ({result.factCheck.length})
                </p>
                <ul className="space-y-3.5">
                  {result.factCheck.map((fc, i) => (
                    <li
                      key={i}
                      className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl bg-navy-900/40 px-4 py-3"
                    >
                      <span className="font-medium text-ink-100">{fc.publisher}</span>
                      <RatingChip rating={fc.textualRating} />
                      {fc.sourceUrl && (
                        <a
                          href={fc.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-accent-300 hover:text-accent-400 text-xs font-medium"
                        >
                          ver fonte <ExternalLink size={12} />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
