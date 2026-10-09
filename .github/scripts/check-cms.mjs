import { pathToFileURL } from 'node:url';

// No rendering, filesystem writes, uploads, or publishing. Never output bodies or secrets.
export async function checkConnection(env, request = fetch) {
  let httpStatus = null;
  try {
    if (env.MICROCMS_SERVICE_DOMAIN !== 'oc-to' || !env.MICROCMS_API_KEY) {
      return { httpSuccess: false, httpStatus, publishedWorks: null };
    }
    const response = await request('https://oc-to.microcms.io/api/v1/works?limit=1', {
      method: 'GET',
      headers: { 'X-MICROCMS-API-KEY': env.MICROCMS_API_KEY },
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    httpStatus = response.status;
    if (!response.ok) return { httpSuccess: false, httpStatus, publishedWorks: null };
    const data = await response.json();
    const valid = Array.isArray(data.contents) && Number.isSafeInteger(data.totalCount) && data.totalCount >= 0;
    return { httpSuccess: true, httpStatus, publishedWorks: valid ? data.totalCount : null };
  } catch {
    return { httpSuccess: httpStatus !== null && httpStatus >= 200 && httpStatus < 300, httpStatus, publishedWorks: null };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkConnection(process.env);
  console.log(JSON.stringify(result));
  if (!result.httpSuccess || result.publishedWorks === null) process.exitCode = 1;
}
