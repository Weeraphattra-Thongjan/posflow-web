const jwt = require('jsonwebtoken');

const JWT_SECRET = 'Y5uXs8d3kLnAU7TIBaQHizRFMWebqPEDgwZlcK1tCoVp0m2jxvG4SfJNOrh6y9'; // ← ตัวเดียวกับใน .env

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 ปี

const anon = jwt.sign({ role: 'anon', iss: 'supabase', iat, exp }, JWT_SECRET);
const service = jwt.sign({ role: 'service_role', iss: 'supabase', iat, exp }, JWT_SECRET);

console.log('ANON_KEY=' + anon);
console.log('SERVICE_ROLE_KEY=' + service);
