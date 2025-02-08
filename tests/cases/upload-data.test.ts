import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { DataStoreProgram, DataStoreTypeOption, SerializationStatusOption } from "../../src/index";
import { assert } from "../utils";

export async function uploadDataTest(connection: Connection, feePayer: Keypair) {
  console.log("\nTesting data store initialization and upload...");
  
  // Create test data
  const dataAccount = new Keypair();
  const testData = { message: "Hello World!", timestamp: Date.now() };
  const serializedData = JSON.stringify(testData);
  const dataBuffer = Buffer.from(serializedData, "utf-8");
  
  console.log("Data Account:", dataAccount.publicKey.toBase58());
  console.log("Test Data:", serializedData);

  // Get initial balance
  const initialBalance = await connection.getBalance(feePayer.publicKey);

  // Initialize data store
  const [pda, bumpSeed] = DataStoreProgram.getPDA(dataAccount.publicKey);
  const initIx = DataStoreProgram.initializeDataStore(
    feePayer.publicKey,
    dataAccount.publicKey, 
    feePayer.publicKey,
    DataStoreTypeOption.File,
    false,
    dataBuffer.length,
    false,
    true // debug mode
  );

  console.log("Initializing data store...");
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(initIx),
    [feePayer, dataAccount],
    { skipPreflight: true }
  );

  // Upload data
  console.log("Uploading data...");
  const updateIx = DataStoreProgram.updateDataStore(
    feePayer.publicKey,
    dataAccount.publicKey,
    dataBuffer,
    0,  // offset
    false, // don't realloc down
    DataStoreTypeOption.File,
    true // debug mode
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(updateIx),
    [feePayer],
    { skipPreflight: true }
  );

  // Verify metadata
  const metadata = await DataStoreProgram.parseMetadataFromAccountInfo(
    await connection.getAccountInfo(pda)
  );

  assert(metadata.authority === feePayer.publicKey.toBase58(), 
    "Authority mismatch in metadata");
  assert(metadata.dataStatus === SerializationStatusOption.Initialized,
    "Incorrect data status");
  assert(metadata.dataType === DataStoreTypeOption.File,
    "Incorrect data type");
  assert(!metadata.isDynamic, "isDynamic should be false");

  // Verify data
  const accountData = await connection.getAccountInfo(dataAccount.publicKey);
  const storedData = accountData?.data.toString('utf-8');
  assert(storedData === serializedData, "Stored data mismatch");

  // Close accounts
  console.log("Cleaning up...");
  const closeIx = DataStoreProgram.closeDataStore(
    feePayer.publicKey,
    dataAccount.publicKey,
    true // debug mode
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(closeIx),
    [feePayer],
    { skipPreflight: true }
  );

  // Verify cleanup
  const finalBalance = await connection.getBalance(feePayer.publicKey);
  assert(finalBalance > initialBalance, "Balance should increase after closing accounts");
  
  const [dataInfo, pdaInfo] = await Promise.all([
    connection.getAccountInfo(dataAccount.publicKey),
    connection.getAccountInfo(pda)
  ]);
  
  assert(!dataInfo, "Data account should be closed");
  assert(!pdaInfo, "PDA account should be closed");
}
