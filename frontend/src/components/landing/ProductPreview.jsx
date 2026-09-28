import { ArrowUpRight, CheckCircle2, Download, Landmark, MoreHorizontal, UsersRound } from 'lucide-react';
import { Avatar, StatusPill } from './LandingPrimitives.jsx';

const turns = [
  ['1', 'Tunde', 'Disbursed'],
  ['2', 'Chioma', 'Disbursed'],
  ['3', 'Femi', 'Disbursed'],
  ['4', 'Samuel', 'Collecting'],
  ['5', 'Amara', 'Apr'],
  ['6', 'Kola', 'May']
];

export const ProductPreview = () => (
  <div id="product" className="relative overflow-hidden rounded-2xl border border-pamoja-forest/8 bg-white p-3 shadow-pamoja-deep sm:p-5 lg:p-6">
    <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-pamoja-ochre/10 blur-3xl" aria-hidden="true" />
    <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-pamoja-sage-deep/40 blur-3xl" aria-hidden="true" />

    <div className="relative space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-pamoja-sage px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pamoja-forest text-sm font-bold text-white">LT</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-pamoja-forest-deep sm:text-base">Lagos Techies Savings Circle</h3>
              <StatusPill>Active cycle</StatusPill>
            </div>
            <p className="mt-1 text-xs text-pamoja-muted">10 members · Monthly cycle #4 of 10 · ₦50,000/member</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="hidden items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-semibold text-pamoja-forest sm:inline-flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-pamoja-emerald" /> Ledger synchronized
          </span>
          <button type="button" className="pamoja-focus inline-flex items-center gap-1.5 rounded-md bg-pamoja-forest px-3 py-2 text-xs font-semibold text-white">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Statement
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PreviewStat label="Total pool size" value="₦500,000" detail="Fixed rotational disbursement" />
        <PreviewStat label="Collected this round" value="₦400,000" detail="8 of 10 paid" progress="80%" tone="green" />
        <PreviewStat label="Outstanding" value="₦100,000" detail="2 pending" tone="ochre" />
        <div className="relative overflow-hidden rounded-xl bg-pamoja-forest p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pamoja-sage-deep">Round 4 recipient</span>
            <CheckCircle2 className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" />
          </div>
          <p className="mt-3 text-xl font-bold tracking-tight">Samuel Oladipo</p>
          <p className="mt-1 text-xs text-pamoja-sage-deep">Payout due: 28 March 2027</p>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-pamoja-sage-deep">
            <Landmark className="h-4 w-4" aria-hidden="true" /> Access Bank ·••449
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-xl border border-pamoja-forest/8 bg-pamoja-canvas p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pamoja-muted">Rotational progress</p>
              <p className="mt-1 text-sm font-semibold text-pamoja-forest">Cycle 4 fulfillment rate</p>
            </div>
            <span className="text-2xl font-bold text-pamoja-forest">80%</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-pamoja-sage-deep">
            <div className="h-2 w-4/5 rounded-full bg-pamoja-forest" />
          </div>
          <div className="mt-5 flex min-w-0 gap-3 overflow-hidden pb-1">
            {turns.map(([round, name, status]) => (
              <div key={round} className="min-w-[72px] text-center">
                <div className={['mx-auto grid h-9 w-9 place-items-center rounded-full border-2 text-xs font-bold', status === 'Collecting' ? 'border-pamoja-ochre bg-pamoja-ochre/10 text-pamoja-ochre' : 'border-pamoja-sage-deep bg-white text-pamoja-forest'].join(' ')}>
                  {round}
                </div>
                <p className="mt-2 truncate text-[11px] font-semibold text-pamoja-forest">{name}</p>
                <p className="mt-0.5 text-[10px] text-pamoja-muted">{status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-pamoja-sage p-4">
          <div className="flex items-center gap-2 text-pamoja-forest">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Next in line</p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Avatar initials="AE" className="h-11 w-11 bg-white" />
            <div>
              <p className="font-semibold text-pamoja-forest">Amara Eze</p>
              <p className="text-xs text-pamoja-muted">Round #5 · April</p>
            </div>
            <ArrowUpRight className="ml-auto h-4 w-4 text-pamoja-ochre" aria-hidden="true" />
          </div>
          <div className="mt-5 rounded-lg bg-white/75 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-pamoja-muted">Auto-disbursement</span>
              <span className="font-semibold text-pamoja-forest">Prepared</span>
            </div>
            <p className="mt-2 text-lg font-bold text-pamoja-forest">₦500,000</p>
            <p className="mt-1 text-xs text-pamoja-muted">Payout destination is verified in the product workflow.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PreviewStat = ({ label, value, detail, progress, tone = 'default' }) => (
  <div className="flex min-h-[142px] flex-col justify-between rounded-xl bg-pamoja-sage p-4">
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pamoja-muted">{label}</span>
      {tone !== 'default' && <span className={tone === 'ochre' ? 'rounded-full bg-orange-100 px-2 py-1 text-[10px] font-semibold text-orange-800' : 'rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800'}>{detail}</span>}
    </div>
    <div>
      <p className={['mt-2 text-2xl font-bold tracking-tight', tone === 'ochre' ? 'text-pamoja-ochre' : 'text-pamoja-forest'].join(' ')}>{value}</p>
      {progress ? (
        <>
          <div className="mt-3 h-2 rounded-full bg-pamoja-sage-deep"><div className="h-2 w-4/5 rounded-full bg-pamoja-forest" /></div>
          <p className="mt-2 text-xs text-pamoja-muted">{detail}</p>
        </>
      ) : <p className="mt-1 text-xs text-pamoja-muted">{detail}</p>}
    </div>
  </div>
);
