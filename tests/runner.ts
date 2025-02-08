// src/tests/runner.ts
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
import {
  uploadDataTest,
  updateDataTest,
  updateAuthTest,
  finalizeDataTest
} from "./cases";

interface TestCase {
  name: string;
  run: (connection: Connection, ...args: any[]) => Promise<void>;
}

export async function runTests() {
  dotenv.config();

  const connection = new Connection(process.env.CONNECTION_URL as string);
  const primary = Keypair.fromSecretKey(bs58.decode(process.env.TEST_PRIMARY_PRIVATE as string));
  const secondary = Keypair.fromSecretKey(bs58.decode(process.env.TEST_SECONDARY_PRIVATE as string));

  const testCases: TestCase[] = [
    { name: "Upload Data", run: async (conn) => uploadDataTest(conn, primary) },
    { name: "Update Data", run: async (conn) => updateDataTest(conn, primary) },
    { name: "Update Authority", run: async (conn) => updateAuthTest(conn, primary, secondary) },
    { name: "Finalize Data", run: async (conn) => finalizeDataTest(conn, primary) }
  ];

  await ensureBalance(connection, [primary, secondary]);

  for (const test of testCases) {
    try {
      console.log(`\n=== Running ${test.name} Test ===`);
      await test.run(connection);
      console.log(`✓ ${test.name} Test Passed`);
    } catch (err) {
      console.error(`✗ ${test.name} Test Failed:`, err);
      throw err;
    }
  }
}

async function ensureBalance(connection: Connection, accounts: Keypair[]) {
  const MIN_BALANCE = 1e9; // 1 SOL
  const AIRDROP_AMOUNT = 1.5e9; // 1.5 SOL

  for (const account of accounts) {
    const balance = (await connection.getAccountInfo(account.publicKey))?.lamports ?? 0;
    if (balance < MIN_BALANCE) {
      console.log(`Airdropping SOL to ${account.publicKey.toBase58()}...`);
      await connection.requestAirdrop(account.publicKey, AIRDROP_AMOUNT);
      await connection.confirmTransaction(await connection.getLatestBlockhash());
    }
  }
}