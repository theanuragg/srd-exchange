const { createClient, getClient } = require('@reservoir0x/relay-sdk');
console.log(Object.keys(getClient ? getClient().actions || {} : {}));
