import { Activity, Check, CircleDollarSign, Download, MoreHorizontal, Search, ShieldCheck } from 'lucide-react';
import { Avatar, SectionHeading, StatusPill } from './LandingPrimitives.jsx';

const members = [
  ['BK', 'Babajide Kolapo', 'Jan', '₦100,000', 'Paid', 'Moniepoint ···201'],
  ['NA', 'Ngozi Adeleke', 'Feb', '₦100,000', 'Paid', 'GTBank ···884'],
  ['CO', 'Chinedu Okeke', 'Mar', '₦100,000', 'Paid', 'Zenith ···519'],
  ['TM', 'Tolulope Makanjuola', 'Apr', '₦100,000', 'Pending', 'Access ···932'],
  ['HB', 'Hadiza Bello', 'May', '₦100,000', 'Upcoming', 'Kuda ···104']
];

export const ShowcaseSection = () => (
  <section className="pamoja-section" aria-labelledby="showcase-heading">
    <SectionHeading
      id="showcase-heading"
      eyebrow="Live operational interface"
      title="A shared view of the current cycle."
      description="A product preview of the ledger, contribution status, and activity feed that keep a circle moving together."
    />
    <div className="mt-10 overflow-hidden rounded-2xl border border-pamoja-forest/8 bg-white shadow-pamoja-raised">
      <div className="flex flex-col justify-between gap-4 border-b border-pamoja-forest/8 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pamoja-muted">Ikeja Entrepreneurs Cooperative</p>
          <h3 className="mt-1 text-xl font-semibold text-pamoja-forest">Real-world ledger execution for an active circle.</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="pamoja-focus grid h-9 w-9 place-items-center rounded-lg border border-pamoja-forest/10 text-pamoja-muted" aria-label="Search preview"><Search className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" className="pamoja-focus inline-flex items-center gap-2 rounded-lg bg-pamoja-forest px-3 py-2 text-xs font-semibold text-white"><Download className="h-3.5 w-3.5" aria-hidden="true" /> Export</button>
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="min-w-0 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Target pool" value="₦1,000,000" />
            <MiniMetric label="Contribution" value="₦100,000/mo" />
            <MiniMetric label="Members" value="10 total" />
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pamoja-muted">Roster and contribution status</p>
              <p className="mt-1 text-sm font-semibold text-pamoja-forest">Round 3 of 10</p>
            </div>
            <StatusPill>Ledger synced</StatusPill>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-pamoja-forest/8">
            <table className="min-w-[620px] w-full divide-y divide-pamoja-forest/8 text-left text-sm">
              <thead className="bg-pamoja-canvas text-[10px] font-semibold uppercase tracking-[0.12em] text-pamoja-muted">
                <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Turn</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Destination</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-pamoja-forest/8">
                {members.map(([initials, name, turn, amount, status, destination]) => (
                  <tr key={name} className="text-pamoja-body">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar initials={initials} /><span className="font-semibold text-pamoja-forest">{name}</span></div></td>
                    <td className="px-4 py-3 text-pamoja-muted">{turn}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{amount}</td>
                    <td className="px-4 py-3 text-pamoja-muted">{destination}</td>
                    <td className="px-4 py-3"><span className={['rounded-full px-2.5 py-1 text-xs font-semibold', status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : status === 'Pending' ? 'bg-orange-100 text-orange-800' : 'bg-pamoja-sage text-pamoja-forest'].join(' ')}>{status}{status === 'Paid' && <Check className="ml-1 inline h-3 w-3" aria-hidden="true" />}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="border-t border-pamoja-forest/8 bg-pamoja-sage p-4 sm:p-6 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-pamoja-forest"><Activity className="h-4 w-4" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-[0.14em]">Live activity feed</p></div>
          <div className="mt-5 space-y-5">
            <ActivityRow label="Babajide K." detail="Paid ₦100,000 via direct transfer" time="12 mins ago" tone="green" />
            <ActivityRow label="Ngozi A." detail="Paid ₦100,000 via virtual account" time="1 hr ago" tone="ochre" />
            <ActivityRow label="Cycle 3 payout approved" detail="Recipient review completed" time="3 hrs ago" tone="forest" />
          </div>
          <div className="mt-7 rounded-xl bg-pamoja-forest p-4 text-white"><ShieldCheck className="h-5 w-5 text-pamoja-ochre" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">A clear record for every contribution.</p><p className="mt-1 text-xs leading-5 text-pamoja-sage-deep">The preview uses demonstration data and is separate from the live application dashboard.</p></div>
        </div>
      </div>
    </div>
  </section>
);

const MiniMetric = ({ label, value }) => <div className="rounded-lg bg-pamoja-sage p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pamoja-muted">{label}</p><p className="mt-2 text-lg font-bold text-pamoja-forest tabular-nums">{value}</p></div>;
const ActivityRow = ({ label, detail, time, tone }) => <div className="flex gap-3"><span className={['mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', tone === 'green' ? 'bg-emerald-100 text-emerald-800' : tone === 'ochre' ? 'bg-orange-100 text-orange-800' : 'bg-white text-pamoja-forest'].join(' ')}><CircleDollarSign className="h-4 w-4" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-pamoja-forest">{label}</p><p className="mt-0.5 text-xs leading-5 text-pamoja-muted">{detail}</p><p className="mt-1 text-[10px] text-pamoja-muted">{time}</p></div><MoreHorizontal className="ml-auto h-4 w-4 text-pamoja-muted" aria-hidden="true" /></div>;
