export interface PrecisionGridOptions {

    /**
     * Precision grid cell size for snapping vertices.
     *
     * If 0 or when not defined, the highest precision is used (IEE754 double),
     * which provides _almost_ 16 decimal digits of precision.
     *
     * If nonzero, input as well as resulting coordinates will be snapped to
     * a precision grid of that size.
     */
    gridSize?: number;

}
