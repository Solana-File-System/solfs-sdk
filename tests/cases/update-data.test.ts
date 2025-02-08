import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { DataStoreProgram, DataStoreTypeOption } from "../../src/index";
import { assert } from "../utils";

export async function updateDataTest(connection: Connection, feePayer: Keypair) {
  console.log("\nTesting data store updates...");
  
  const dataAccount = new Keypair();
  console.log("Data Account:", dataAccount.publicKey.toBase58());

  // Initialize with "Hxxlo"
  const initialData = "Hxxlo";
  console.log("Initial data:", initialData);

  const [pda] = DataStoreProgram.getPDA(dataAccount.publicKey);
  const initIx = DataStoreProgram.initializeDataStore(
    feePayer.publicKey,
    dataAccount.publicKey,
    feePayer.publicKey,
    DataStoreTypeOption.File,
    false,
    12, // Space for "Hello World!"
    true, // Dynamic sizing
    true  // Debug mode
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(initIx),
    [feePayer, dataAccount],
    { skipPreflight: true }
  );

  // Write initial data
  const writeIx = DataStoreProgram.updateDataStore(
    feePayer.publicKey,
    dataAccount.publicKey,
    Buffer.from(initialData),
    0,
    false,
    DataStoreTypeOption.File,
    true
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(writeIx),
    [feePayer],
    { skipPreflight: true }
  );

  // Update "xx" to "el"
  console.log('Updating "xx" to "el"...');
  const updateIx = DataStoreProgram.updateDataStore(
    feePayer.publicKey,
    dataAccount.publicKey,
    Buffer.from("el"),
    1,
    false,
    DataStoreTypeOption.File,
    true
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(updateIx),
    [feePayer],
    { skipPreflight: true }
  );

  // Verify "Hello"
  let data = (await connection.getAccountInfo(dataAccount.publicKey))?.data;
  assert(data?.toString().startsWith("Hello"), "Failed to update 'xx' to 'el'");

  // Append " World!"
  console.log('Appending " World!"...');
  const appendIx = DataStoreProgram.updateDataStore(
    feePayer.publicKey,
    dataAccount.publicKey,
    Buffer.from(" World!"),
    5,
    false,
    DataStoreTypeOption.File,
    true
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(appendIx),
    [feePayer],
    { skipPreflight: true }
  );

  // Verify final data
  data = (await connection.getAccountInfo(dataAccount.publicKey))?.data;
  assert(data?.toString() === "Hello World!", "Failed to append ' World!'");

  // Cleanup
  console.log("Cleaning up...");
  const closeIx = DataStoreProgram.closeDataStore(
    feePayer.publicKey,
    dataAccount.publicKey,
    true
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(closeIx),
    [feePayer],
    { skipPreflight: true }
  );
}
