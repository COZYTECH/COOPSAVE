import { useCallback, useEffect, useRef, useState } from 'react';
import { CreditCard, RefreshCw, Users, WalletCards, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { usePaymentEvents } from '../hooks/usePaymentEvents';
import { getApiError } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { getGroups } from '../lib/access';
import { useAuth } from '../context/AuthContext.jsx';
import { groupApi } from '../services/groupApi';

export const MemberDashboardPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const membership = getGroups(user).find((group) => String(group.id) === String(groupId));
  const [group, setGroup] = useState(null);
  const [paymentIdentity, setPaymentIdentity] = useState(null);
  const [obligations, setObligations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [bankForm, setBankForm] = useState({ bank_code: '', bank_name: '', account_number: '' });
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [creatingCheckoutId, setCreatingCheckoutId] = useState(null);
  const checkoutInFlightRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [groupData, identity, contributionData, transactionData, bankData, payoutData] = await Promise.all([
        groupApi.get(groupId),
        groupApi.paymentIdentity(groupId),
        groupApi.myContributions(groupId),
        groupApi.myTransactions(groupId),
        groupApi.bankAccounts(groupId),
        groupApi.myPayouts(groupId)
      ]);
      setGroup(groupData);
      setPaymentIdentity(identity);
      setObligations(contributionData);
      setTransactions(transactionData);
      setBankAccounts(bankData);
      setPayouts(payoutData);
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load this Ajo.'));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  usePaymentEvents(useCallback(() => { load(); }, [load]));

  const retryProvisioning = async () => {
    setError('');
    try {
      setPaymentIdentity(await groupApi.provisionPaymentIdentity(groupId));
    } catch (provisionError) {
      setError(getApiError(provisionError, 'Unable to provision your payment account.'));
    }
  };

  const verifyBank = async (event) => {
    event.preventDefault();
    setVerifyingBank(true);
    setError('');
    try {
      const account = await groupApi.verifyBankAccount(groupId, bankForm);
      setBankAccounts((current) => [account, ...current.filter((item) => item.id !== account.id)]);
      setBankForm({ bank_code: '', bank_name: '', account_number: '' });
    } catch (verifyError) {
      setError(getApiError(verifyError, 'Unable to verify this bank account.'));
    } finally {
      setVerifyingBank(false);
    }
  };

  const startCheckout = async (obligation) => {
    if (checkoutInFlightRef.current !== null) {
      return;
    }

    checkoutInFlightRef.current = obligation.id;
    setCreatingCheckoutId(obligation.id);
    setError('');

    try {
      const checkout = await groupApi.createCheckout(groupId, obligation.id);
      window.location.assign(checkout.checkoutUrl);
    } catch (checkoutError) {
      setError(getApiError(checkoutError, 'Unable to create a Flutterwave payment.'));
      setCreatingCheckoutId(null);
      checkoutInFlightRef.current = null;
    }
  };

  useEffect(() => {
    document.title = 'Pamoja | My Ajo';
    load();
  }, [load]);

  if (loading) {
    return <LoadingState label="Loading your Ajo..." />;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-pamoja-forest p-5 text-white shadow-pamoja-deep sm:p-6">
        <p className="pamoja-eyebrow text-pamoja-sage-deep">Member workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">My Ajo{group?.name ? ` · ${group.name}` : ''}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pamoja-sage-deep">This view is scoped to your membership in this Ajo. Group administration controls are intentionally not shown.</p>
      </section>

      {error && <Alert>{error}</Alert>}

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><Users className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Group information</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">{group?.name || membership?.name || 'My Ajo'}</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">{group?.description || 'Group information is available. Contribution and payout data will appear when member APIs are implemented.'}</p><p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-pamoja-muted">Access: {membership?.role === 'GROUP_ADMIN' ? 'Group administrator' : 'Group member'}</p></div></div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><WalletCards className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="pamoja-eyebrow">Your Ajo payment account</p>
            <h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">{paymentIdentity?.status === 'ACTIVE' ? 'Ready to receive contributions' : 'Account provisioning'}</h2>
            <p className="mt-2 text-sm leading-6 text-pamoja-muted">{paymentIdentity?.status === 'ACTIVE' ? 'Use this provider account only for this Ajo.' : paymentIdentity?.provisioningError || 'Your group-specific payment account is being prepared.'}</p>
            {paymentIdentity?.status === 'ACTIVE' && <div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-pamoja-muted">Bank</p><p className="mt-1 font-semibold text-pamoja-ink">{paymentIdentity.bankName || 'Flutterwave'}</p></div><div><p className="text-xs text-pamoja-muted">Account number</p><p className="mt-1 font-semibold text-pamoja-ink">{paymentIdentity.accountNumber || 'Not returned'}</p></div><div><p className="text-xs text-pamoja-muted">Account name</p><p className="mt-1 font-semibold text-pamoja-ink">{paymentIdentity.accountName || 'Not returned'}</p></div></div>}
            {(paymentIdentity?.status === 'FAILED' || !paymentIdentity) && <button type="button" onClick={retryProvisioning} className="pamoja-focus mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-pamoja-forest/12 px-3 text-sm font-semibold text-pamoja-forest hover:bg-pamoja-sage"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><WalletCards className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="pamoja-eyebrow">My contributions</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Ajo obligations</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">Your contribution progress is scoped to this Ajo membership. Final confirmation depends on server-side verification.</p></div></div><Link to={`/groups/${groupId}/cycles`} className="pamoja-focus inline-flex shrink-0 items-center rounded-lg border border-pamoja-forest/12 px-3 py-2 text-xs font-semibold text-pamoja-forest">My cycles</Link></div><div className="mt-4 space-y-2">{obligations.length === 0 ? <p className="rounded-lg bg-pamoja-sage/70 p-3 text-sm text-pamoja-muted">No active obligations yet.</p> : obligations.map((obligation) => <div key={obligation.id} className="rounded-lg border border-pamoja-forest/8 p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-pamoja-ink">{obligation.cycleName || 'Current cycle'}</p><StatusBadge status={obligation.status === 'PAID' ? 'success' : obligation.status === 'EXCESS_PENDING_REVIEW' ? 'pending' : 'neutral'}>{obligation.status}</StatusBadge></div>{Number(obligation.amountOutstanding) > 0 && obligation.status !== 'PAID' && <Button type="button" loading={creatingCheckoutId === obligation.id} onClick={() => startCheckout(obligation)} className="shrink-0"><CreditCard className="h-4 w-4" aria-hidden="true" />Pay {formatCurrency(obligation.amountOutstanding, obligation.currency)}</Button>}</div><div className="mt-2 grid grid-cols-3 gap-2 text-xs"><span><span className="block text-pamoja-muted">Expected</span><strong className="mt-1 block text-pamoja-ink">{formatCurrency(obligation.expectedAmount, obligation.currency)}</strong></span><span><span className="block text-pamoja-muted">Paid</span><strong className="mt-1 block text-pamoja-forest">{formatCurrency(obligation.amountPaid, obligation.currency)}</strong></span><span><span className="block text-pamoja-muted">Outstanding</span><strong className="mt-1 block text-pamoja-ochre">{formatCurrency(obligation.amountOutstanding, obligation.currency)}</strong></span></div></div>)}</div></Card>
        <Card className="p-5 sm:p-6"><p className="pamoja-eyebrow">Payment history</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Verified contributions</h2><p className="mt-2 text-sm text-pamoja-muted">{transactions.length} payment record{transactions.length === 1 ? '' : 's'} recorded for this Ajo.</p><div className="mt-4 space-y-2">{transactions.slice(0, 4).map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-lg bg-pamoja-sage/70 px-3 py-3"><div><p className="text-sm font-semibold text-pamoja-ink">{formatCurrency(transaction.grossAmount)}</p><p className="text-xs text-pamoja-muted">{transaction.cycleName || 'Ajo contribution'} · Record #{transaction.id}</p></div><StatusBadge status={transaction.status === 'SUCCESS' ? 'success' : transaction.status === 'FAILED' ? 'danger' : 'pending'}>{transaction.status}</StatusBadge></div>)}</div></Card>
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Verified payout account</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Your bank details</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">Verify a Nigerian bank account before you are selected as a cycle recipient. Account numbers are never displayed after verification.</p></div></div>
          <div className="mt-4 space-y-2">{bankAccounts.map((account) => <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg bg-pamoja-sage/70 px-3 py-3"><div><p className="text-sm font-semibold text-pamoja-ink">{account.bankName || account.bankCode}</p><p className="text-xs text-pamoja-muted">{account.accountNumberMasked} · {account.accountName}</p></div><StatusBadge status={account.verificationStatus === 'VERIFIED' ? 'success' : 'pending'}>{account.verificationStatus}</StatusBadge></div>)}</div>
          <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={verifyBank}>
            <FormField id="bank-code" label="Bank code" value={bankForm.bank_code} onChange={(event) => setBankForm({ ...bankForm, bank_code: event.target.value })} required placeholder="e.g. 044" />
            <FormField id="bank-name" label="Bank name" value={bankForm.bank_name} onChange={(event) => setBankForm({ ...bankForm, bank_name: event.target.value })} placeholder="Optional" />
            <FormField id="account-number" label="Account number" value={bankForm.account_number} onChange={(event) => setBankForm({ ...bankForm, account_number: event.target.value.replace(/\D/g, '').slice(0, 10) })} required inputMode="numeric" placeholder="10 digits" />
            <Button type="submit" loading={verifyingBank} className="sm:col-span-3"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Verify account</Button>
          </form>
        </Card>
        <Card className="p-5 sm:p-6"><p className="pamoja-eyebrow">Payout history</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Cycle payouts</h2><p className="mt-2 text-sm text-pamoja-muted">Payouts appear here only when your group configures you as the recipient.</p><div className="mt-4 space-y-2">{payouts.length === 0 ? <p className="rounded-lg bg-pamoja-sage/70 p-3 text-sm text-pamoja-muted">No payouts for this Ajo yet.</p> : payouts.map((payout) => <div key={payout.id} className="flex items-center justify-between gap-3 rounded-lg bg-pamoja-sage/70 px-3 py-3"><div><p className="text-sm font-semibold text-pamoja-ink">{formatCurrency(payout.amount)}</p><p className="text-xs text-pamoja-muted">{payout.cycleName || 'Ajo cycle'} · {payout.accountNumberMasked || 'Verified account'}</p></div><StatusBadge status={payout.status === 'SUCCESS' ? 'success' : payout.status === 'FAILED' ? 'danger' : 'pending'}>{payout.status}</StatusBadge></div>)}</div></Card>
      </div>
    </div>
  );
};
