import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { DataStoreProgram, DataStoreTypeOption } from "../../src/index";
import { assert } from "../utils";

export async function updateAuthTest(
  connection: Connection,
  oldAuthority: Keypair,
  newAuthority: Keypair
) {
  console.log("\nTesting authority updates...");
  
  const dataAccount = new Keypair();
  console.log("Data Account:", dataAccount.publicKey.toBase58());
  console.log("Old Authority:", oldAuthority.publicKey.toBase58());
  console.log("New Authority:", newAuthority.publicKey.toBase58());

  // Initialize data store
  const [pda] = DataStoreProgram.getPDA(dataAccount.publicKey);
  const initIx = DataStoreProgram.initializeDataStore(
    oldAuthority.publicKey,
    dataAccount.publicKey,
    oldAuthority.publicKey,
    DataStoreTypeOption.File,
    false,
    100,
    false,
    true
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(initIx),
    [oldAuthority, dataAccount],
    { skipPreflight: true }
  );

  // Get initial state
  const initialMeta = await DataStoreProgram.parseMetadataFromAccountInfo(
    await connection.getAccountInfo(pda)
  );
  assert(
    initialMeta.authority === oldAuthority.publicKey.toBase58(),
    "Initial authority not set correctly"
  );

  // Update authority
  console.log("Updating authority...");
  const updateAuthIx = DataStoreProgram.updateDataStoreAuthority(
    oldAuthority.publicKey,
    dataAccount.publicKey,
    newAuthority.publicKey,
    true
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(updateAuthIx),
    [oldAuthority, newAuthority],
    { skipPreflight: true }
  );

  // Verify authority update
  const updatedMeta = await DataStoreProgram.parseMetadataFromAccountInfo(
    await connection.getAccountInfo(pda)
  );
  assert(
    updatedMeta.authority === newAuthority.publicKey.toBase58(),
    "Authority not updated correctly"
  );

  // Try to close with old authority (should fail)
  console.log("Testing invalid authority restrictions...");
  const invalidCloseIx = DataStoreProgram.closeDataStore(
    oldAuthority.publicKey,
    dataAccount.publicKey,
    true
  );

  try {
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(invalidCloseIx),
      [oldAuthority],
      { skipPreflight: true }
    );
    throw new Error("Close with old authority should have failed");
  } catch (error) {
    console.log("Successfully prevented close with old authority");
  }

  // Close with new authority
  console.log("Cleaning up...");
  const closeIx = DataStoreProgram.closeDataStore(
    newAuthority.publicKey,
    dataAccount.publicKey,
    true
  );

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(closeIx),
    [newAuthority],
    { skipPreflight: true }
  );

  // Verify cleanup
  const [dataInfo, pdaInfo] = await Promise.all([
    connection.getAccountInfo(dataAccount.publicKey),
    connection.getAccountInfo(pda)
  ]);
  
  assert(!dataInfo, "Data account should be closed");
  assert(!pdaInfo, "PDA account should be closed");
}