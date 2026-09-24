/** Ejecuta una acción sobre varios registros; si alguno falla, avisa cuántos sí se aplicaron. */
export async function runAll<T>(ids: T[], fn: (id: T) => Promise<unknown>): Promise<void> {
  const results = await Promise.allSettled(ids.map((id) => fn(id)));
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed.length) {
    const reason = failed[0].reason?.message || 'Error desconocido';
    throw new Error(`${ids.length - failed.length} de ${ids.length} se aplicaron. ${failed.length} fallaron: ${reason}`);
  }
}
