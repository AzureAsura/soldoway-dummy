const fs = require('fs');
const dts = fs.readFileSync('node_modules/@privy-io/react-auth/dist/index.d.ts', 'utf8');
const lines = dts.split('\n');
lines.forEach((l, i) => {
  if (l.includes('interface ConnectedSolanaWallet')) {
     console.log(lines.slice(i, i+20).join('\n'));
  }
});
