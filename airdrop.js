const fs = require('fs');
const { Connection, Keypair, LAMPORTS_PER_SOL } = require("@solana/web3.js");

async function airdrop() {
  const envFile = fs.readFileSync('.env', 'utf-8');
  const keyLine = envFile.split('\n').find(l => l.startsWith('SERVER_WALLET_PRIVATE_KEY='));
  
  if (!keyLine) {
    console.log("Key not found in .env");
    return;
  }

  const keyVal = keyLine.split('=')[1].replace(/'/g, '').replace(/"/g, '');
  const secretKey = Uint8Array.from(JSON.parse(keyVal));
  const serverKeypair = Keypair.fromSecretKey(secretKey);
  console.log("Server Pubkey:", serverKeypair.publicKey.toBase58());
  
  const rpcUrl = "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  
  try {
    console.log("Requesting airdrop...");
    const signature = await connection.requestAirdrop(serverKeypair.publicKey, 1 * LAMPORTS_PER_SOL);
    console.log("Airdrop requested. Signature:", signature);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    console.log("Airdrop confirmed!");
    const balance = await connection.getBalance(serverKeypair.publicKey);
    console.log("New Balance:", balance / 1e9, "SOL");
  } catch(e) {
    console.error("Airdrop failed:", e);
  }
}

airdrop();
