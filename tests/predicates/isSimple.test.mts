import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import { isSimple } from '../../src/predicates/isSimple.mjs';
import { fromWKT } from '../../src/io/wkt.mjs';


describe('isSimple', () => {

    before(async () => {
        await initializeForTest();
    });

    it('should return whether geometry is simple', () => {
        // point geometry is always simple
        assert.equal(isSimple(fromWKT('POINT (0 1)')), true);
        assert.equal(isSimple(fromWKT('POINT Z (0 1 2)')), true);
        assert.equal(isSimple(fromWKT('POINT ZM (0 1 2 3)')), true);

        // multipoint geometry is simple when all its points are unique
        assert.equal(isSimple(fromWKT('MULTIPOINT ((0 1), (0 2))')), true);
        assert.equal(isSimple(fromWKT('MULTIPOINT ((0 1), (0 1))')), false);

        // linestring geometry is simple when there are no self-intersections (other than at the boundary points)
        assert.equal(isSimple(fromWKT('LINESTRING (0 0, 1 1)')), true);
        assert.equal(isSimple(fromWKT('MULTILINESTRING ((0 1, 2 1), (0 0, 2 1))')), true); // touch at the endpoint - OK
        assert.equal(isSimple(fromWKT('MULTILINESTRING ((0 1, 2 1), (0 0, 2 1), (0 2, 2 1))')), true); // touch at the endpoint - OK
        assert.equal(isSimple(fromWKT('LINESTRING (0 0, 2 2, 1 2, 1 0)')), false); // cross
        assert.equal(isSimple(fromWKT('MULTILINESTRING ((0 0, 10 10), (0 5, 5 0))')), false); // cross
        assert.equal(isSimple(fromWKT('LINESTRING (0 0, 0 1, 1 1, 1 0, 0 0)')), true); // ring - OK
        assert.equal(isSimple(fromWKT('MULTILINESTRING ((0 0, 0 1, 1 0, 0 0), (0.2 0, 0.8 0))')), false); // one of the segments intersects
        assert.equal(isSimple(fromWKT('MULTILINESTRING ((0 0, 0 1), (0 1, 1 0), (1 0, 0 0))')), true);

        assert.equal(isSimple(fromWKT('POLYGON ((1 1, 4 4, 1 4, 4 1, 1 1))')), false); // self-intersection at shell
        assert.equal(isSimple(fromWKT('POLYGON ((0 0, 0 10, 10 10, 10 0, 0 0), (1 1, 4 4, 1 4, 4 1, 1 1))')), false); // self-intersection at hole
        assert.equal(isSimple(fromWKT('GEOMETRYCOLLECTION(MULTILINESTRING ((10 20, 90 20), (10 30, 90 30), (50 40, 50 10)), MULTIPOINT((1 1), (1 2), (1 2), (1 3), (1 4), (1 4), (1 5), (1 5)))')), false);
    });

    it('should return true for empty geometry', () => {
        assert.equal(isSimple(fromWKT('POINT EMPTY')), true);
        assert.equal(isSimple(fromWKT('LINESTRING EMPTY')), true);
        assert.equal(isSimple(fromWKT('POLYGON EMPTY')), true);
        assert.equal(isSimple(fromWKT('MULTIPOINT EMPTY')), true);
        assert.equal(isSimple(fromWKT('MULTILINESTRING EMPTY')), true);
        assert.equal(isSimple(fromWKT('MULTIPOLYGON EMPTY')), true);
        assert.equal(isSimple(fromWKT('GEOMETRYCOLLECTION EMPTY')), true);
    });

    it('should throw on unsupported geometry type', () => {
        assert.throws(() => isSimple(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)')), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved types not supported in IsSimpleOp.',
        });
    });

});
