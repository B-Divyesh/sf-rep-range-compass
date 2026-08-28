const origin = 'https://rep-range-compass.sociobot.in';
const api = 'https://api.sociobot.in/api/v1/products/rep-range-compass';
const request = (url, init = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
const failures = [];

const checkout = await request(`${api}/checkout`, { redirect: 'manual' });
const checkoutBody = await checkout.text();
if (!(checkout.status >= 300 && checkout.status < 400 && checkout.headers.has('location'))) {
  failures.push(`checkout must redirect to hosted payment; received HTTP ${checkout.status}: ${checkoutBody}`);
}

const ordinary = await request(`${api}/verify?license=release-check-invalid`, {
  headers: { Origin: origin }
});
const ordinaryBody = await ordinary.json();
if (ordinary.status !== 200) failures.push(`ordinary invalid-license check returned HTTP ${ordinary.status}, expected 200`);
if (ordinary.headers.get('access-control-allow-origin') !== origin) failures.push('verification CORS did not allow the product origin');
if (ordinaryBody.valid !== false || ordinaryBody.reason !== 'invalid') failures.push(`unexpected invalid-license verdict: ${JSON.stringify(ordinaryBody)}`);

const stamp = Date.now();
const burst = await Promise.all(Array.from({ length: 80 }, (_, index) => request(
  `${api}/verify?license=release-check-${stamp}-${index}`,
  { headers: { Origin: origin } }
)));
const limited = burst.filter((response) => response.status === 429);
if (limited.length === 0) failures.push(`verification burst must be limited; received ${burst.length} responses and no HTTP 429`);
if (!limited.every((response) => response.headers.has('retry-after'))) failures.push('every HTTP 429 must include Retry-After');

console.log(JSON.stringify({ checkout: checkout.status, verification: ordinary.status, limited: limited.length, burst: burst.length }));
if (failures.length) throw new Error(failures.join('\n'));
