const virtualAccountRepository = require("../../repositories/virtualAccountRepository");
const AppError = require("../../utils/appError");

const allocateAccount = async (member = {}, connection) => {
  if (!connection) {
    throw new Error("A transaction connection is required to allocate an account.");
  }

  // Row-level locking is required so concurrent member creation requests do
  // not reserve the same AVAILABLE sandbox account from the pool. The enclosing
  // business transaction is owned by MemberService.
  const account = await virtualAccountRepository.findAvailableForUpdate(
    connection,
  );

  if (!account) {
    throw new AppError("No sandbox virtual accounts available.", 409);
  }

  await virtualAccountRepository.reserveAccount(account.id, connection);
  const reservedAccount = await virtualAccountRepository.findById(
    account.id,
    connection,
  );

  // member is accepted for future strategy context, but the current sandbox
  // reservation rule depends only on the virtual account resource pool.
  void member;

  return {
    id: reservedAccount.id,
    accountRef: reservedAccount.account_ref,
    accountNumber: reservedAccount.account_number,
    accountName: reservedAccount.account_name,
  };
};

module.exports = {
  allocateAccount,
};
