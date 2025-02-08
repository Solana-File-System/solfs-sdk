import {
    AccountInfo,
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";

/**
 * Program ID of the Data Store Program
 */
export const DATA_STORE_PROGRAM_ID = new PublicKey("CxcgUrnSLjL7S44vLFxq6Jc7zscw5MUrZsobo711gmaq");

/**
 * Seed used to derive the associated Data Store PDA Account
 */
export const PDA_SEED = "data_store";

/**
 * Enumeration of the data types supported by the Data Store
 * 
 * @export
 * @enum {number}
 */
export enum DataStoreTypeOption {
    File = 0,
    Directory = 1,
}

/**
 * Enumeration of the serialization states of the Data Store Account
 * 
 * @export
 * @enum {number}
 */
export enum SerializationStatusOption {
    Uninitialized = 0,
    Initialized = 1,
    Finalized = 2,
}

/**
 * Data stored in the Data Store PDA Account that represents
 * the metadata associated with a Data Store Account.
 * 
 * @export
 * @interface IDataStoreAccountMetadata
 */
export interface IDataStoreAccountMetadata {
    /** Type of data stored in the Data Store Account */
    dataType: DataStoreTypeOption;
    
    /** Base58-encoded string that represents the `PublicKey` of the authority */
    authority: string;
    
    /** Status of the Data Store Account */
    dataStatus: SerializationStatusOption;
    
    /** Bump seed used to derive the Data Store PDA Account */
    bumpSeed: number;

    /** Hash of the data stored in the Data Store Account */
    dataHash: Uint8Array;

    /** `false` if the Data Store Account is static (fixed size) and `true` if dynamic (can realloc) */
    isDynamic: boolean;

    /** Space allocated for the Data Store Account */
    space: number;
}

/**
 * Data Store Program class
 * 
 * @export
 * @class DataStoreProgram
 */
export class DataStoreProgram {
    /**
     * Returns the corresponding Data Store PDA Account for the given data account.
     * 
     * @param {PublicKey} dataKey 
     * @return {[PublicKey, number]} 
     */
    static getPDA = (dataKey: PublicKey): [PublicKey, number] => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(PDA_SEED), dataKey.toBuffer()],
            DATA_STORE_PROGRAM_ID
        );
    };

    /**
     * Returns instruction to initialize the Data Store Account and associated PDA Account.
     * 
     * @param {PublicKey} feePayer Account paying for the transaction
     * @param {PublicKey} dataAccount Data Store Account to initialize
     * @param {PublicKey} authority Authority of the Data Store Account
     * @param {DataStoreTypeOption} dataType Type of data to be stored
     * @param {boolean} isCreated Whether the account has been pre-created
     * @param {number} space Space to allocate for the account
     * @param {boolean} isDynamic Whether the account can be reallocated
     * @param {boolean} [debug] Enable debug logging
     * @return {TransactionInstruction} 
     */
    static initializeDataStore = (
        feePayer: PublicKey,  
        dataAccount: PublicKey,
        authority: PublicKey,
        dataType: DataStoreTypeOption,
        isCreated: boolean,
        space: number,
        isDynamic: boolean,
        debug?: boolean
    ): TransactionInstruction => {
        const [pda] = this.getPDA(dataAccount);

        const instructionData = createInitializeDataStoreInstruction({
            debug: debug || false,
            dataType,
            isCreated,
            space: new BN(space),
            authority,
            isDynamic,
        });

        return new TransactionInstruction({
            keys: [
                { pubkey: feePayer, isSigner: true, isWritable: true },
                { pubkey: dataAccount, isSigner: !isCreated, isWritable: true },
                { pubkey: pda, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: DATA_STORE_PROGRAM_ID,
            data: instructionData,
        });
    };

    /**
     * Returns instruction to update data in a Data Store Account.
     * 
     * @param {PublicKey} authority Authority of the Data Store Account
     * @param {PublicKey} dataAccount Data Store Account to update
     * @param {Buffer} data Data to write
     * @param {number} offset Offset at which to write data
     * @param {boolean} reallocDown Whether to reduce account size after update
     * @param {DataStoreTypeOption} dataType Type of data being stored
     * @param {boolean} [debug] Enable debug logging
     * @return {TransactionInstruction}
     */
    static updateDataStore = (
        authority: PublicKey,
        dataAccount: PublicKey,
        data: Buffer,
        offset: number,
        reallocDown: boolean,
        dataType: DataStoreTypeOption,
        debug?: boolean
    ): TransactionInstruction => {
        const [pda] = this.getPDA(dataAccount);

        const instructionData = createUpdateDataStoreInstruction({
            debug: debug || false,
            data,
            offset: new BN(offset),
            reallocDown,
            dataType,
        });

        return new TransactionInstruction({
            keys: [
                { pubkey: authority, isSigner: true, isWritable: true },
                { pubkey: dataAccount, isSigner: false, isWritable: true },
                { pubkey: pda, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: DATA_STORE_PROGRAM_ID,
            data: instructionData,
        });
    };

    /**
     * Returns instruction to update the authority of a Data Store Account.
     * 
     * @param {PublicKey} oldAuthority Current authority
     * @param {PublicKey} dataAccount Data Store Account
     * @param {PublicKey} newAuthority New authority to set
     * @param {boolean} [debug] Enable debug logging
     * @return {TransactionInstruction}
     */
    static updateDataStoreAuthority = (
        oldAuthority: PublicKey,
        dataAccount: PublicKey, 
        newAuthority: PublicKey,
        debug?: boolean
    ): TransactionInstruction => {
        const [pda] = this.getPDA(dataAccount);

        // Create instruction data
        const instructionData = createUpdateAuthorityInstruction(debug || false);

        return new TransactionInstruction({
            keys: [
                { pubkey: oldAuthority, isSigner: true, isWritable: false },
                { pubkey: dataAccount, isSigner: false, isWritable: false },
                { pubkey: pda, isSigner: false, isWritable: true },
                { pubkey: newAuthority, isSigner: true, isWritable: false },
            ],
            programId: DATA_STORE_PROGRAM_ID,
            data: instructionData,
        });
    };

    /**
     * Returns instruction to finalize a Data Store Account.
     * 
     * @param {PublicKey} authority Authority of the account
     * @param {PublicKey} dataAccount Data Store Account to finalize
     * @param {boolean} [debug] Enable debug logging
     * @return {TransactionInstruction}
     */
    static finalizeDataStore = (
        authority: PublicKey,
        dataAccount: PublicKey,
        debug?: boolean
    ): TransactionInstruction => {
        const [pda] = this.getPDA(dataAccount);

        // Create instruction data
        const instructionData = createFinalizeInstruction(debug || false);

        return new TransactionInstruction({
            keys: [
                { pubkey: authority, isSigner: true, isWritable: false },
                { pubkey: dataAccount, isSigner: false, isWritable: false },
                { pubkey: pda, isSigner: false, isWritable: true },
            ],
            programId: DATA_STORE_PROGRAM_ID,
            data: instructionData,
        });
    };

    /**
     * Returns instruction to close a Data Store Account.
     * 
     * @param {PublicKey} authority Authority of the account
     * @param {PublicKey} dataAccount Data Store Account to close
     * @param {boolean} [debug] Enable debug logging
     * @return {TransactionInstruction}
     */
    static closeDataStore = (
        authority: PublicKey,
        dataAccount: PublicKey,
        debug?: boolean
    ): TransactionInstruction => {
        const [pda] = this.getPDA(dataAccount);

        // Create instruction data
        const instructionData = borshSerialize({
            debug: debug || false,
        });

        return new TransactionInstruction({
            keys: [
                { pubkey: authority, isSigner: true, isWritable: true },
                { pubkey: dataAccount, isSigner: false, isWritable: true },
                { pubkey: pda, isSigner: false, isWritable: true },
            ],
            programId: DATA_STORE_PROGRAM_ID,
            data: instructionData,
        });
    };

    /**
     * Returns the parsed metadata from a Data Store PDA Account's data.
     * 
     * @param {AccountInfo<Buffer> | null} metadataInfo Account info for the PDA
     * @return {IDataStoreAccountMetadata}
     */
    static parseMetadataFromAccountInfo = (
        metadataInfo: AccountInfo<Buffer> | null
    ): IDataStoreAccountMetadata => {
        if (!metadataInfo || !metadataInfo.data.length) {
            throw new Error("Invalid metadata account data");
        }

        // Deserialize using borsh layout matching Rust struct
        const metadata = borshDeserialize(metadataInfo.data);
        
        return {
            dataType: metadata.dataType,
            authority: new PublicKey(metadata.authority).toBase58(),
            dataStatus: metadata.dataStatus,
            bumpSeed: metadata.bumpSeed,
            dataHash: metadata.dataHash,
            isDynamic: metadata.isDynamic,
            space: metadata.space,
        };
    };
}

import {
    createInitializeDataStoreInstruction,
    createUpdateDataStoreInstruction,
    createUpdateAuthorityInstruction,
    createFinalizeInstruction,
    createCloseInstruction,
} from './utils/serialization';