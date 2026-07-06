const fetch = require('node-fetch');
async function test() {
  const r = await fetch("https://api.relay.link/currencies/v1", {
    method: "POST", headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chainIds: [56], limit: 1 })
  });
  console.log(await r.json());
}
test();
