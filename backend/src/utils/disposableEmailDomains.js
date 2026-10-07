// Blocklist of disposable and temporary email domains (at least 20)
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  'trashmail.com',
  'tempmail.com',
  'throwawaymail.com',
  'sharklasers.com',
  'getairmail.com',
  'dispostable.com',
  'mailcatch.com',
  'fakeinbox.com',
  'mytrashmail.com',
  'mailexpire.com',
  'temporarymail.com',
  'spamgourmet.com',
  'mintemail.com',
  'tempinbox.com',
  'discard.email',
  'discardmail.com',
  'burnermail.io',
  'dropmail.me'
]);

function isDisposableEmailDomain(domain) {
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase().trim());
}

module.exports = {
  DISPOSABLE_DOMAINS,
  isDisposableEmailDomain
};
