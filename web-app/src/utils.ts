export function isWindowsOS() {
  return window.navigator.userAgent.toLowerCase().includes('windows');
}

export function isMacOS() {
  return window.navigator.userAgent.toLowerCase().includes('mac');
}
