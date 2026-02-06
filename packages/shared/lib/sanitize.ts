/**
 * Input sanitization utilities for XSS protection
 */

// HTML entity map for escaping
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize user input - removes potentially dangerous content
 * while preserving safe characters for display
 */
export function sanitizeInput(input: string, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Escape HTML entities
  sanitized = escapeHtml(sanitized);
  
  return sanitized;
}

/**
 * Sanitize nickname - more restrictive than general input
 */
export function sanitizeNickname(nickname: string): string {
  if (!nickname || typeof nickname !== 'string') return '';
  
  // Trim and limit length
  let sanitized = nickname.trim().substring(0, 50);
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Escape HTML
  sanitized = escapeHtml(sanitized);
  
  return sanitized;
}

/**
 * Sanitize message content
 */
export function sanitizeMessage(message: string): string {
  return sanitizeInput(message, 2000);
}

/**
 * Sanitize device name
 */
export function sanitizeDeviceName(name: string): string {
  return sanitizeInput(name, 100);
}

/**
 * Sanitize device description
 */
export function sanitizeDescription(description: string): string {
  return sanitizeInput(description, 500);
}

/**
 * Validate and sanitize URL (for Apprise URLs)
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // Basic URL validation - must start with a valid scheme
  const validSchemes = ['http://', 'https://', 'ntfy://', 'ntfys://', 'tgram://', 'discord://', 'slack://', 'pushover://'];
  const hasValidScheme = validSchemes.some(scheme => trimmed.toLowerCase().startsWith(scheme));
  
  if (!hasValidScheme) {
    return '';
  }
  
  // Limit length
  return trimmed.substring(0, 500);
}
