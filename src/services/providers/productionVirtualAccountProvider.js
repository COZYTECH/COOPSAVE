const allocateAccount = async (member, connection) => {
  // Production allocation will eventually call Nomba's Create Virtual Account API,
  // persist the allocated account details, and return:
  // { accountRef, accountNumber, accountName }
  void member;
  void connection;

  throw new Error(
    "Production virtual account allocation has not been implemented."
  );
};

module.exports = {
  allocateAccount
};
