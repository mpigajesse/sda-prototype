/**
 * Formats a byte count into a human-readable string.
 * e.g. 1536 → "1.5 KB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(1)} ${units[exponent]}`
}

/**
 * Formats an uptime in seconds into a human-readable string.
 * e.g. 3725 → "1h 2min"
 */
export function formatUptime(seconds: number): string {
  const days  = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins  = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}j ${hours}h`
  if (hours > 0) return `${hours}h ${mins}min`
  return `${mins}min`
}

/**
 * Returns a French relative time string from an ISO date string.
 * e.g. "il y a 2s", "il y a 5min", "il y a 3h"
 */
export function formatTimeAgo(isoString: string): string {
  const diffSeconds = Math.floor(
    (Date.now() - new Date(isoString).getTime()) / 1000,
  )

  if (diffSeconds < 60)   return `il y a ${diffSeconds}s`
  if (diffSeconds < 3600) return `il y a ${Math.floor(diffSeconds / 60)}min`
  if (diffSeconds < 86400) return `il y a ${Math.floor(diffSeconds / 3600)}h`
  return `il y a ${Math.floor(diffSeconds / 86400)}j`
}

/**
 * Returns the first 7 characters of a device ID followed by "…".
 * e.g. "MFZWI3D-BONSGYC-…"
 */
export function shortDeviceId(id: string): string {
  if (id.length <= 7) return id
  return `${id.slice(0, 7)}…`
}
