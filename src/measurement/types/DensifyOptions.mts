export interface DensifyOptions {

    /**
     * Optional fraction by which densify each line segment.
     *
     * Each segment will be split into a number of equal-length subsegments, whose
     * fraction of the total length is closest to the given fraction.
     * Value of `0.25` means that each segment will be split into four equal length
     * subsegments.
     *
     * The closer to `0` the better the approximation of the distance.
     */
    densify?: number;

}
