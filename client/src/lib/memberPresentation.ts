export function getMemberInitials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.length ? parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join("") : "?";
}

export function getMemberFirstName(name?: string | null) {
  return name?.trim().split(/\s+/).filter(Boolean)[0] || "Bienvenue";
}
