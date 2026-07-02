const toMember = (member) => {
  if (!member) {
    return null;
  }

  return {
    id: member.id,
    cooperativeId: member.cooperative_id,
    fullName: member.full_name,
    email: member.email,
    phone: member.phone,
    accountRef: member.account_ref,
    accountNumber: member.account_number,
    accountName: member.account_name,
    createdAt: member.created_at
  };
};

module.exports = {
  toMember
};
