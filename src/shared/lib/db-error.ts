export function isUniqueConstraintError(error: unknown): boolean {
  const candidate = error as { code?: string; errno?: number; message?: string };
  const message = String(candidate?.message || '').toLowerCase();

  return (
    candidate?.code === '23505' ||
    candidate?.code === 'SQLITE_CONSTRAINT' ||
    candidate?.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    candidate?.code === 'ER_DUP_ENTRY' ||
    candidate?.errno === 1062 ||
    message.includes('duplicate key value violates unique constraint') ||
    message.includes('unique constraint failed') ||
    message.includes('duplicate entry')
  );
}
