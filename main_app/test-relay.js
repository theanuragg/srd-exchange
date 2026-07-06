const fetch = require('node-fetch');
async function test() {
  const res = await fetch("https://api.relay.link/currencies/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 10 })
  });
  const data = await res.json();
  console.log(JSON.stringify(data).slice(0, 500));
}
test();
