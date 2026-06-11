const fs = require('fs');
const dts = fs.readFileSync('node_modules/@privy-io/react-auth/solana/dist/index.d.ts', 'utf8');
const lines = dts.split('\n');
lines.forEach(l => {
  if (l.includes('useSignAndSendTransaction')) console.log(l.trim());
});
