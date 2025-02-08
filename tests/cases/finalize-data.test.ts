import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { DataStoreProgram, DataStoreTypeOption, SerializationStatusOption } from "../../src/index";
import { assert } from "../utils";

export async function finalizeDataTest(connection: Connection, authority: Keypair) {
    console.log("\nTesting data store finalization...");
    
    const dataAccount = new Keypair();
    console.log("Data Account:", dataAccount.publicKey.toBase58());
    
    // Initialize data store
    const [pda] = DataStoreProgram.getPDA(dataAccount.publicKey);
    const testData = "Final test data";
    
    console.log("Initializing data store...");
    const initIx = DataStoreProgram.initializeDataStore(
        authority.publicKey,
        dataAccount.publicKey,
        authority.publicKey,
        DataStoreTypeOption.File,
        false,
        testData.length,
        false, // not dynamic
        true // debug
    );

    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(initIx),
        [authority, dataAccount],
        { skipPreflight: true }
    );

    // Write initial data
    console.log("Writing test data...");
    const writeIx = DataStoreProgram.updateDataStore(
        authority.publicKey,
        dataAccount.publicKey,
        Buffer.from(testData),
        0,
        false,
        DataStoreTypeOption.File,
        true
    );

    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(writeIx),
        [authority],
        { skipPreflight: true }
    );

    // Verify initial state
    let metadata = await DataStoreProgram.parseMetadataFromAccountInfo(
        await connection.getAccountInfo(pda)
    );
    assert(
        metadata.dataStatus === SerializationStatusOption.Initialized,
        "Data should be in initialized state before finalization"
    );

    // Finalize the data store
    console.log("Finalizing data store...");
    const finalizeIx = DataStoreProgram.finalizeDataStore(
        authority.publicKey,
        dataAccount.publicKey,
        true
    );

    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(finalizeIx),
        [authority],
        { skipPreflight: true }
    );

    // Verify finalized state
    metadata = await DataStoreProgram.parseMetadataFromAccountInfo(
        await connection.getAccountInfo(pda)
    );
    assert(
        metadata.dataStatus === SerializationStatusOption.Finalized,
        "Data should be in finalized state after finalization"
    );

    // Attempt to update finalized data (should fail)
    console.log("Testing update restrictions on finalized data...");
    const updateIx = DataStoreProgram.updateDataStore(
        authority.publicKey,
        dataAccount.publicKey,
        Buffer.from("New data"),
        0,
        false,
        DataStoreTypeOption.File,
        true
    );

    try {
        await sendAndConfirmTransaction(
            connection,
            new Transaction().add(updateIx),
            [authority],
            { skipPreflight: true }
        );
        throw new Error("Update of finalized data should have failed");
    } catch (error) {
        if (error.message.includes("Update of finalized data should have failed")) {
            throw error;
        }
        console.log("Successfully prevented update of finalized data");
    }

    // Verify data remains unchanged
    const accountData = await connection.getAccountInfo(dataAccount.publicKey);
    assert(
        accountData?.data.toString() === testData,
        "Data should remain unchanged after failed update attempt"
    );

    // Close the data store
    console.log("Cleaning up...");
    const closeIx = DataStoreProgram.closeDataStore(
        authority.publicKey,
        dataAccount.publicKey,
        true
    );

    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(closeIx),
        [authority],
        { skipPreflight: true }
    );

    // Verify accounts are closed
    const [dataInfo, pdaInfo] = await Promise.all([
        connection.getAccountInfo(dataAccount.publicKey),
        connection.getAccountInfo(pda)
    ]);
    
    assert(!dataInfo, "Data account should be closed");
    assert(!pdaInfo, "PDA account should be closed");
}