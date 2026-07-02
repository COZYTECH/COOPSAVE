const toCooperative = (cooperative) => {
  if (!cooperative) {
    return null;
  }

  return {
    id: cooperative.id,
    name: cooperative.name,
    description: cooperative.description,
    ownerId: cooperative.owner_id,
    createdAt: cooperative.created_at
  };
};

module.exports = {
  toCooperative
};
