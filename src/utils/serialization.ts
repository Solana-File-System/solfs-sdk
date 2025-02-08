import { PublicKey } from "@solana/web3.js";
import { Schema, serialize, deserialize } from "borsh";
import { sha256 } from "@noble/hashes/sha256";
import BN from "bn.js";

// Borsh class implementations for serialization
class InitializeDataStoreArgs {
    debug: boolean;
    dataType: number;
    bumpSeed: number;
    isCreated: boolean;
    space: BN;
    authority: Uint8Array;
    isDynamic: boolean;

    constructor(args: {
        debug: boolean;
        dataType: number;
        bumpSeed: number;
        isCreated: boolean;
        space: BN;
        authority: PublicKey;
        isDynamic: boolean;
    }) {
        this.debug = args.debug;
        this.dataType = args.dataType;
        this.bumpSeed = args.bumpSeed;
        this.isCreated = args.isCreated;
        this.space = args.space;
        this.authority = args.authority.toBytes();
        this.isDynamic = args.isDynamic;
    }
}

class UpdateDataStoreArgs {
    debug: boolean;
    dataHash: Uint8Array;
    data: Uint8Array;
    offset: BN;
    reallocDown: boolean;
    dataType: number;

    constructor(args: {
        debug: boolean;
        dataHash: Uint8Array;
        data: Buffer;
        offset: BN;
        reallocDown: boolean;
        dataType: number;
    }) {
        this.debug = args.debug;
        this.dataHash = args.dataHash;
        this.data = args.data;
        this.offset = args.offset;
        this.reallocDown = args.reallocDown;
        this.dataType = args.dataType;
    }
}

class UpdateDataStoreAuthorityArgs {
    debug: boolean;

    constructor(args: { debug: boolean }) {
        this.debug = args.debug;
    }
}

class FinalizeDataStoreArgs {
    debug: boolean;

    constructor(args: { debug: boolean }) {
        this.debug = args.debug;
    }
}

class CloseDataStoreArgs {
    debug: boolean;

    constructor(args: { debug: boolean }) {
        this.debug = args.debug;
    }
}

// Borsh schema definitions matching Rust structs
const schemas: Map<Function, Schema> = new Map([
    [
        InitializeDataStoreArgs,
        {
            kind: 'struct',
            fields: [
                ['debug', 'bool'],
                ['dataType', 'u8'],
                ['bumpSeed', 'u8'],
                ['isCreated', 'bool'],
                ['space', 'u64'],
                ['authority', [32]],
                ['isDynamic', 'bool'],
            ],
        },
    ],
    [
        UpdateDataStoreArgs,
        {
            kind: 'struct',
            fields: [
                ['debug', 'bool'],
                ['dataHash', [32]],
                ['data', ['u8']],
                ['offset', 'u64'],
                ['reallocDown', 'bool'],
                ['dataType', 'u8'],
            ],
        },
    ],
    [
        UpdateDataStoreAuthorityArgs,
        {
            kind: 'struct',
            fields: [['debug', 'bool']],
        },
    ],
    [
        FinalizeDataStoreArgs,
        {
            kind: 'struct',
            fields: [['debug', 'bool']],
        },
    ],
    [
        CloseDataStoreArgs,
        {
            kind: 'struct',
            fields: [['debug', 'bool']],
        },
    ],
]);

// Serialization functions
export function serializeInstructionData(instruction: any): Buffer {
    const schema = schemas.get(instruction.constructor);
    if (!schema) {
        throw new Error('Schema not found for instruction');
    }
    return Buffer.from(serialize(schema, instruction));
}

// Calculate SHA-256 hash of data
export function calculateDataHash(data: Buffer): Uint8Array {
    return sha256(data);
}

// Main instruction data creation functions
export function createInitializeDataStoreInstruction(args: {
    debug: boolean;
    dataType: number;
    bumpSeed: number;
    isCreated: boolean;
    space: BN;
    authority: PublicKey;
    isDynamic: boolean;
}): Buffer {
    const instruction = new InitializeDataStoreArgs(args);
    return serializeInstructionData(instruction);
}

export function createUpdateDataStoreInstruction(args: {
    debug: boolean;
    data: Buffer;
    offset: BN;
    reallocDown: boolean;
    dataType: number;
}): Buffer {
    const dataHash = calculateDataHash(args.data);
    const instruction = new UpdateDataStoreArgs({
        ...args,
        dataHash,
    });
    return serializeInstructionData(instruction);
}

export function createUpdateAuthorityInstruction(debug: boolean): Buffer {
    return serializeInstructionData(new UpdateDataStoreAuthorityArgs({ debug }));
}

export function createFinalizeInstruction(debug: boolean): Buffer {
    return serializeInstructionData(new FinalizeDataStoreArgs({ debug }));
}

export function createCloseInstruction(debug: boolean): Buffer {
    return serializeInstructionData(new CloseDataStoreArgs({ debug }));
}