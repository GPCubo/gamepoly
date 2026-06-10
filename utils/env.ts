export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || window.location.origin
}

export function getWsBaseUrl(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}