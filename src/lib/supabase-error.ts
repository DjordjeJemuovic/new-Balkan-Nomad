type SupabaseErrorLike = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function describeSupabaseError(error: SupabaseErrorLike) {
  return [error.message, error.code && `kod: ${error.code}`, error.details, error.hint && `predlog: ${error.hint}`]
    .filter(Boolean)
    .join(' — ');
}
