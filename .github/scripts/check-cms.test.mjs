import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConnection } from './check-cms.mjs';
const env = { MICROCMS_SERVICE_DOMAIN: 'oc-to', MICROCMS_API_KEY: 'synthetic-test-only' };
test('zero published works is HTTP success', async () => {
  const result = await checkConnection(env, async (url, options) => {
    assert.equal(url, 'https://oc-to.microcms.io/api/v1/works?limit=1');
    assert.equal(options.method,'GET');
    assert.equal(options.redirect,'error');
    assert.equal(options.headers['X-MICROCMS-API-KEY'],env.MICROCMS_API_KEY);
    return Response.json({contents:[],totalCount:0});
  });
  assert.deepEqual(result,{httpSuccess:true,httpStatus:200,publishedWorks:0});
});
test('only count is returned, never content or credentials', async () => {
  const result = await checkConnection(env, async () => Response.json({contents:[{title:'private'}],totalCount:12}));
  assert.deepEqual(result,{httpSuccess:true,httpStatus:200,publishedWorks:12});
});
test('missing key or unexpected domain makes no network request', async () => {
  for (const input of [{...env,MICROCMS_API_KEY:''},{...env,MICROCMS_SERVICE_DOMAIN:'other'}]) {
    let calls = 0;
    assert.deepEqual(await checkConnection(input, () => {calls++; throw new Error('must not call');}), {httpSuccess:false,httpStatus:null,publishedWorks:null});
    assert.equal(calls, 0);
  }
});
test('HTTP failure reports status only without reading response body', async () => {
  for (const status of [401,403,404,429,500]) {
    assert.deepEqual(await checkConnection(env, async () => new Response('private error',{status})),{httpSuccess:false,httpStatus:status,publishedWorks:null});
  }
});
test('invalid JSON, schema and network errors expose no details', async () => {
  for (const response of [new Response('private invalid JSON'),Response.json({contents:[],totalCount:-1}),Response.json({totalCount:0})]) {
    assert.deepEqual(await checkConnection(env, async () => response),{httpSuccess:true,httpStatus:200,publishedWorks:null});
  }
  assert.deepEqual(await checkConnection(env, async () => {throw new Error('private network error');}),{httpSuccess:false,httpStatus:null,publishedWorks:null});
});
