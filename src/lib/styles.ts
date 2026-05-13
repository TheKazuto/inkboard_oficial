/**
 * styles.ts — shared inline style constants.
 *
 * Centralises style objects that were created as new inline objects on
 * every render. Import and use `style={JAKARTA}` instead of writing
 * `style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}` inline.
 */

/** Stable reference — no new object created per render. */
export const JAKARTA = { fontFamily: 'Plus Jakarta Sans, sans-serif' } as const
