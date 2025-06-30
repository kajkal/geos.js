import type { Ptr } from './types/WasmGEOS.mjs';
import { POINTER } from './symbols.mjs';
import { geos } from './geos.mjs';


export class ReusableBuffer {

    /** @internal */
    readonly [ POINTER ]: Ptr<any>;

    readonly i4: number; // pointer/offset / 4
    readonly l: number; // byteLength
    readonly l4: number; // byteLength / 4

    constructor(ptr: number, length: number) {
        this[ POINTER ] = (ptr >>>= 0) as Ptr<any>;
        this.i4 = ptr / 4;
        this.l = length;
        this.l4 = length / 4;
    }

    freeIfTmp(): void {
        if (this !== geos.buff) {
            geos.free(this[ POINTER ]);
        }
    }

}


type PtrTarget<T> = T extends Array<infer E> ? Ptr<E> : T;

export interface OutPtr<T> {

    [ POINTER ]: Ptr<T>;

    get(): PtrTarget<T>;

}

export class ReusableU32<T = unknown> {

    /** @internal */
    readonly [ POINTER ]: Ptr<T>;

    private readonly i: number;

    constructor(ptr: number) {
        this[ POINTER ] = (ptr >>>= 0) as Ptr<T>;
        this.i = ptr / 4;
    }

    get(): PtrTarget<T> {
        return geos.U32[ this.i ] as PtrTarget<T>;
    }

    set(v: number): void {
        geos.U32[ this.i ] = v;
    }

}


export class ReusableF64 {

    /** @internal */
    readonly [ POINTER ]: Ptr<any>;

    private readonly i: number;

    constructor(ptr: number) {
        this[ POINTER ] = (ptr >>>= 0) as Ptr<any>;
        this.i = ptr / 8;
    }

    get(): number {
        return geos.F64[ this.i ];
    }

    set(v: number): void {
        geos.F64[ this.i ] = v;
    }

}
