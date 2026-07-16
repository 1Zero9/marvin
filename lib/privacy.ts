type Identity = { user: { id: string }; membership: { role: string } };

export function visibleTo(identity: Identity) {
  if (identity.membership.role === "owner") return {};
  return { OR: [{ visibility: { in: ["household", "public"] } }, { createdById: identity.user.id }] };
}

export function canManage(identity: Identity, createdById: string | null) {
  return identity.membership.role === "owner" || createdById === identity.user.id;
}
