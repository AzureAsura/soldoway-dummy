const fs = require('fs');
const { Connection, Keypair } = require("@solana/web3.js");

const envFile = fs.readFileSync('.env', 'utf-8');
const keyLine = envFile.split('\n').find(l => l.startsWith('SERVER_WALLET_PRIVATE_KEY='));

if (keyLine) {
  const keyVal = keyLine.split('=')[1].replace(/'/g, '').replace(/"/g, '');
  try {
    const secretKey = Uint8Array.from(JSON.parse(keyVal));
    const serverKeypair = Keypair.fromSecretKey(secretKey);
    console.log("Server Pubkey:", serverKeypair.publicKey.toBase58());
    
    const rpcUrl = "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    connection.getBalance(serverKeypair.publicKey).then(balance => {
      console.log("Balance:", balance / 1e9, "SOL");
    }).catch(e => console.error("RPC Error:", e));
  } catch (err) {
    console.error("Parse Error:", err);
  }
} else {
  console.log("Key not found in .env");
}
