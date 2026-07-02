const SandboxVirtualAccountProvider = require('./providers/sandboxVirtualAccountProvider');
const ProductionVirtualAccountProvider = require('./providers/productionVirtualAccountProvider');

const allocateAccount = async (member, connection) => {
  // This provider is the future allocation boundary for virtual accounts.
  // It selects the current allocation strategy without exposing Sandbox or
  // Production details to MemberService or other business services.
  const provider =
    process.env.NOMBA_ENV === 'production'
      ? ProductionVirtualAccountProvider
      : SandboxVirtualAccountProvider;

  return provider.allocateAccount(member, connection);
};

module.exports = {
  allocateAccount
};
