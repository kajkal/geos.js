export class GeosError extends Error {
    /** @internal */
    constructor(message: string) {
        super(message);
        this.name = 'GeosError';
    }
}
