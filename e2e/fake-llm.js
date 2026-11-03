// OpenAI-compatible stand-in for the backend's LLM in CI (LLM_BASE_URL=http://<host>:<port>/v1).
// Every chat completion answers what a model would say to the flow's "coffee 4.50" prompt.
const http = require('node:http');

const reply = {
  intent: 'record_transactions',
  transactions: [
    {
      kind: 'expense',
      sourceAccount: 'Wallet',
      allocations: [{ amount: '4.50', comment: 'coffee' }],
    },
  ],
};

const port = Number(process.env.PORT ?? 8090);

http
  .createServer((req, res) => {
    if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) {
      res.writeHead(404).end();
      return;
    }
    req.resume().on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: JSON.stringify(reply) } }],
        }),
      );
    });
  })
  .listen(port, () => console.log(`fake LLM on :${port}`));
