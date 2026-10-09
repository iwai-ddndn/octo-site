// Only live, published works can enter a production artifact.
// Credentials remain in the Actions process environment.
try {
  if (process.env.MICROCMS_SERVICE_DOMAIN !== 'oc-to' || !process.env.MICROCMS_API_KEY || process.env.MICROCMS_MOCK) {
    throw new Error('CMS configuration missing or invalid.');
  }
  process.env.CMS_PUBLISH = 'true';
  process.env.MICROCMS_INCLUDE_SITE = 'false';
  await import('../../_site-source/build.mjs');
} catch (error) {
  // Only known validation/status errors are safe to log. Never log response bodies or network errors.
  const safe = String(error.message).match(/^\[(?:cms|publish)\] (?:works: HTTP \d{3}|No published works; keep the current live site unchanged\.|Sample works present; publication blocked\.|Required published works are missing\.|Invalid work URL\.|Duplicate work URLs\.|invalid works response|incomplete works pagination)$/);
  console.error(safe ? safe[0] : 'CMS build failed; no deployment artifact produced.');
  process.exitCode = 1;
}
