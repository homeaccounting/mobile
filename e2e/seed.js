// A fresh user with one 100 USD account per run, so the flow never depends on earlier state.
const email = 'e2e-' + Date.now() + '@example.com';
const password = 'e2e-password-' + Date.now();
const headers = { 'Content-Type': 'application/json' };

const registered = http.post(API_URL + '/api/auth/register', {
  headers: headers,
  body: JSON.stringify({ email: email, password: password }),
});
if (!registered.ok)
  throw new Error('register failed: ' + registered.status + ' ' + registered.body);

const account = http.post(API_URL + '/api/accounts', {
  headers: Object.assign({ Authorization: 'Bearer ' + json(registered.body).token }, headers),
  body: JSON.stringify({ name: 'Wallet', initialBalance: 100, currency: 'USD' }),
});
if (!account.ok) throw new Error('account failed: ' + account.status + ' ' + account.body);

output.email = email;
output.password = password;
