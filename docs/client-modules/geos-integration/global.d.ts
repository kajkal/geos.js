declare global {
    interface Window {
        geos: typeof import('geos.js');
        /** A promise that resolves when 'geos.js' initialization is completed */
        geosPromise: Promise<void>;
        ___params: string[];
        ___args: any[];
    }
}

export {};
