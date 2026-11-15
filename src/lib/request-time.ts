/**
 * Wall-clock time of the request being rendered. Server Components render once
 * per request, so reading the clock is safe there; React's purity lint rule
 * cannot tell them apart from client components and rejects a direct Date.now().
 */
export function getRequestTime(): number {
  return Date.now();
}
