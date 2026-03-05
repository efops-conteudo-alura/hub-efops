const SUPER_ADMINS = [
  "vasco.ginde@alura.com.br",
  "rafael.bomfim@alura.com.br",
  "evelyn.reis@alura.com.br",
];

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMINS.includes(email.toLowerCase());
}
