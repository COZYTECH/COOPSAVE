const nombaService = require('./nomba.service');
const virtualAccountRepository = require('../repositories/virtualAccountRepository');

const logSyncEvent = (event, metadata = {}) => {
  console.log(
    JSON.stringify({
      level: 'info',
      event,
      provider: 'nomba',
      timestamp: new Date().toISOString(),
      ...metadata
    })
  );
};

const normalizeVirtualAccount = (account) => ({
  accountRef:
    account.accountRef ||
    account.account_ref ||
    account.accountReference ||
    account.account_reference ||
    account.reference ||
    null,
  accountNumber:
    account.accountNumber ||
    account.account_number ||
    account.number ||
    account.bankAccountNumber ||
    null,
  accountName:
    account.accountName ||
    account.account_name ||
    account.name ||
    account.bankAccountName ||
    null,
  bankName:
    account.bankName ||
    account.bank_name ||
    account.bank ||
    account.bank?.name ||
    null
});

const isImportableAccount = (account) => {
  return Boolean(account.accountRef && account.accountNumber);
};

const syncSandboxVirtualAccounts = async () => {
  logSyncEvent('nomba.virtual_accounts.sync.started');

  const response = await nombaService.listVirtualAccounts();
  const accounts = nombaService
    .extractVirtualAccounts(response)
    .map(normalizeVirtualAccount)
    .filter(isImportableAccount);

  let imported = 0;
  let skipped = 0;

  for (const account of accounts) {
    const existingAccount = await virtualAccountRepository.findByAccountRef(
      account.accountRef
    );

    if (existingAccount) {
      skipped += 1;
      logSyncEvent('nomba.virtual_accounts.sync.skipped', {
        accountRef: account.accountRef
      });
      continue;
    }

    await virtualAccountRepository.create({
      memberId: null,
      accountRef: account.accountRef,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      provider: 'NOMBA',
      environment: 'SANDBOX',
      status: 'AVAILABLE'
    });

    imported += 1;
    logSyncEvent('nomba.virtual_accounts.sync.imported', {
      accountRef: account.accountRef
    });
  }

  const result = {
    imported,
    skipped,
    total: accounts.length
  };

  logSyncEvent('nomba.virtual_accounts.sync.finished', result);

  return result;
};

module.exports = {
  syncSandboxVirtualAccounts
};
