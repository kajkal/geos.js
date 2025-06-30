import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/Geometry.mjs';
import { POINTER } from '../../src/core/symbols.mjs';
import { makeValid } from '../../src/operations/makeValid.mjs';
import { isValid } from '../../src/predicates/isValid.mjs';
import { lineString, point } from '../../src/helpers/helpers.mjs';
import { fromWKT, toWKT } from '../../src/io/WKT.mjs';
import { geos } from '../../src/core/geos.mjs';


describe('makeValid', () => {

    let i: Geometry, o: Geometry;

    before(async () => {
        await initializeForTest();
    });

    it('should reuse existing MakeValidParams instance', () => {
        const create = mock.method(geos, 'GEOSMakeValidParams_create');

        const a = point([ 0, 0 ]);
        const b = lineString([ [ 0, 0 ], [ 10, 10 ] ]);

        makeValid(a);
        makeValid(b);
        assert.equal(create.mock.callCount(), 1);

        makeValid(a, { method: 'structure' });
        makeValid(b, { method: 'structure' });
        assert.equal(create.mock.callCount(), 2);

        makeValid(a, { method: 'structure', keepCollapsed: true });
        makeValid(b, { method: 'structure', keepCollapsed: true });
        assert.equal(create.mock.callCount(), 3);

        assert.deepEqual(geos.m_v, {
            '': create.mock.calls[ 0 ].result,
            'structure,': create.mock.calls[ 1 ].result,
            'structure,true': create.mock.calls[ 2 ].result,
        });
    });

    it('should set `method` option', () => {
        i = fromWKT('LINESTRING (0 0, 0 0)');
        assert.equal(toWKT(makeValid(i)), 'POINT (0 0)');
        assert.equal(toWKT(makeValid(i, { method: 'structure' })), 'LINESTRING EMPTY');
        assert.equal(toWKT(makeValid(i, { method: 'linework' })), toWKT(makeValid(i))); // default
    });

    it('should set `keepCollapsed` option', () => {
        i = fromWKT('LINESTRING (0 0, 0 0)');
        assert.equal(toWKT(makeValid(i)), 'POINT (0 0)');
        assert.equal(toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })), 'POINT (0 0)');
        assert.equal(toWKT(makeValid(i, { method: 'structure', keepCollapsed: false })), 'LINESTRING EMPTY');
        assert.equal(toWKT(makeValid(i, { method: 'structure', keepCollapsed: false })), toWKT(makeValid(i, { method: 'structure' }))); // default
    });

    it('should handle already valid geometries', () => {
        let wkt: string;

        wkt = 'POINT EMPTY';
        i = fromWKT(wkt);
        o = makeValid(i);
        assert.notEqual(i[ POINTER ], o[ POINTER ]); // a copy
        assert.equal(toWKT(o), wkt);
        o = makeValid(i, { method: 'structure' });
        assert.notEqual(i[ POINTER ], o[ POINTER ]);
        assert.equal(toWKT(o), wkt);

        wkt = 'POINT (0 0)';
        i = fromWKT(wkt);
        o = makeValid(i);
        assert.notEqual(i[ POINTER ], o[ POINTER ]);
        assert.equal(toWKT(o), wkt);
        o = makeValid(i, { method: 'structure' });
        assert.notEqual(i[ POINTER ], o[ POINTER ]);
        assert.equal(toWKT(o), wkt);

        wkt = 'LINESTRING (1 0, 1 1, 0 1, 0 0)';
        i = fromWKT(wkt);
        o = makeValid(i);
        assert.notEqual(i[ POINTER ], o[ POINTER ]);
        assert.equal(toWKT(o), wkt);
        o = makeValid(i, { method: 'structure' });
        assert.notEqual(i[ POINTER ], o[ POINTER ]);
        assert.equal(toWKT(o), wkt);

        wkt = 'POLYGON ((0 0, 1 0, 1 1, 0 0))';
        i = fromWKT(wkt);
        o = makeValid(i);
        assert.notEqual(i[ POINTER ], o[ POINTER ]);
        assert.equal(toWKT(o), wkt);
        o = makeValid(i, { method: 'structure' });
        assert.notEqual(i[ POINTER ], o[ POINTER ]);
        assert.equal(toWKT(o), 'POLYGON ((0 0, 1 1, 1 0, 0 0))'); // ring orientation is not preserved
    });

    it('should repair polygon with self-intersection', () => {
        i = fromWKT('POLYGON ((0 0, 1 1, 1 0, 0 1, 0 0))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'MULTIPOLYGON (((0 1, 0.5 0.5, 0 0, 0 1)), ((1 0, 0.5 0.5, 1 1, 1 0)))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'MULTIPOLYGON (((0.5 0.5, 1 1, 1 0, 0.5 0.5)), ((0 0, 0 1, 0.5 0.5, 0 0)))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));

        // line in disguise
        i = fromWKT('POLYGON ((0 0, 1 1, 1 2, 1 1, 0 0))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'MULTILINESTRING ((0 0, 1 1), (1 1, 1 2))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON EMPTY');
        o = makeValid(i, { method: 'structure', keepCollapsed: true });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'LINESTRING (0 0, 1 1, 1 2, 1 1, 0 0)');

        // example from GEOS
        i = fromWKT('POLYGON ((2.22 2.28, 7.67 2.06, 10.98 7.7, 9.39 5, 7.96 7.12, 6.77 5.16, 7.43 6.24, 3.7 7.22, 5.72 5.77, 4.18 10.74, 2.2 6.83, 2.22 2.28))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((7.96 7.12, 9.39 5, 10.98 7.7, 7.67 2.06, 2.22 2.28, 2.2 6.83, 4.18 10.74, 5.409909154437456 6.770747728860936, 7.426303881090008 6.240971098265896, 7.96 7.12), (3.7 7.22, 5.72 5.77, 5.409909154437456 6.770747728860936, 3.7 7.22), (6.77 5.16, 7.43 6.24, 7.426303881090008 6.240971098265896, 6.77 5.16))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((2.22 2.28, 2.2 6.83, 4.18 10.74, 5.409909154437456 6.770747728860936, 7.426303881090008 6.240971098265896, 7.96 7.12, 9.39 5, 10.98 7.7, 7.67 2.06, 2.22 2.28))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));

        // example from Shapely
        i = fromWKT('MULTIPOLYGON (((2 0, 2 12, 7 12, 7 10, 7 12, 10 12, 8 12, 8 0, 2 0), (3 10, 5 10, 5 12, 3 12, 3 10)), ((4 2, 4 8, 12 8, 12 2, 4 2), (6 4, 10 4, 10 6, 6 6, 6 4)))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'GEOMETRYCOLLECTION (MULTIPOLYGON (((8 4, 10 4, 10 6, 8 6, 8 8, 12 8, 12 2, 8 2, 8 4)), ((2 0, 2 12, 3 12, 5 12, 7 12, 8 12, 8 8, 4 8, 4 2, 8 2, 8 0, 2 0)), ((8 4, 6 4, 6 6, 8 6, 8 4))), MULTILINESTRING ((7 12, 7 10), (8 12, 10 12), (3 10, 5 10, 5 12), (3 12, 3 10)))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((12 8, 12 2, 8 2, 8 0, 2 0, 2 12, 3 12, 3 10, 5 10, 5 12, 7 12, 8 12, 8 8, 12 8), (10 6, 8 6, 8 4, 10 4, 10 6))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));
    });

    it('should repair polygon with external hairline', () => {
        i = fromWKT('POLYGON ((0 0, 1 0, 1 1, 2 2, 2 2, 1 1, 0 1, 0 0))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'GEOMETRYCOLLECTION (POLYGON ((1 0, 0 0, 0 1, 1 1, 1 0)), LINESTRING (1 1, 2 2))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));
    });

    it('should repair polygon with internal hairline', () => {
        i = fromWKT('POLYGON ((0 0, 1 0, 1 1, 0.5 0.5, 1 1, 0 1, 0 0))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'GEOMETRYCOLLECTION (POLYGON ((1 0, 0 0, 0 1, 1 1, 1 0)), LINESTRING (1 1, 0.5 0.5))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((0 0, 0 1, 1 1, 1 0, 0 0))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));
    });

    it('should repair polygon with self-touching exterior ring forming a hole', () => {
        i = fromWKT('POLYGON ((0 0, 0 10, 10 0, 0 0, 4 2, 2 4, 0 0))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((0 10, 10 0, 0 0, 0 10), (4 2, 2 4, 0 0, 4 2))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((0 0, 0 10, 10 0, 0 0), (0 0, 4 2, 2 4, 0 0))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));
    });

    it('should repair polygon where hole is partially outside shell', () => {
        i = fromWKT('POLYGON ((0 0, 0 2, 2 0, 0 0), (0.5 0.5, 2 1, 2 0.5, 0.5 0.5))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'MULTIPOLYGON (((1.5 0.5, 1.25 0.75, 2 1, 2 0.5, 1.5 0.5)), ((2 0, 0 0, 0 2, 1.25 0.75, 0.5 0.5, 1.5 0.5, 2 0)))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((0 2, 1.25 0.75, 0.5 0.5, 1.5 0.5, 2 0, 0 0, 0 2))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));
    });

    it('should repair polygon with disconnected interior ring', () => {
        i = fromWKT('POLYGON ((0 0, 0 10, 10 10, 10 0, 0 0), (5 0, 4 5, 5 10, 6 5, 5 0))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'MULTIPOLYGON (((10 10, 10 0, 5 0, 6 5, 5 10, 10 10)), ((0 0, 0 10, 5 10, 4 5, 5 0, 0 0)))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'MULTIPOLYGON (((0 10, 5 10, 4 5, 5 0, 0 0, 0 10)), ((10 10, 10 0, 5 0, 6 5, 5 10, 10 10)))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));
    });

    it('should repair multipolygon with nested shells', () => {
        i = fromWKT('MULTIPOLYGON (((1 1, 2 3, 1 9, 9 9, 8 3, 9 1, 5 2, 1 1)), ((8 3, 2 3, 5 2, 8 3)))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'MULTIPOLYGON (((1 9, 9 9, 8 3, 2 3, 1 9)), ((9 1, 5 2, 8 3, 9 1)), ((1 1, 2 3, 5 2, 1 1)))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((2 3, 1 9, 9 9, 8 3, 9 1, 5 2, 1 1, 2 3))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));
    });

    it('should repair polygon with nested holes', () => {
        i = fromWKT('POLYGON ((1 9, 9 9, 9 1, 1 1, 1 9), (2 8, 8 8, 8 2, 2 2, 2 8), (5 8, 8 5, 5 2, 2 5, 5 8))');
        assert.equal(isValid(i), false);
        o = makeValid(i);
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'MULTIPOLYGON (((9 1, 1 1, 1 9, 9 9, 9 1), (5 2, 8 2, 8 5, 8 8, 5 8, 2 8, 2 5, 2 2, 5 2)), ((8 5, 5 2, 2 5, 5 8, 8 5)))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'linework' })));
        o = makeValid(i, { method: 'structure' });
        assert.equal(isValid(o), true);
        assert.equal(toWKT(o), 'POLYGON ((9 9, 9 1, 1 1, 1 9, 9 9), (2 8, 2 5, 2 2, 5 2, 8 2, 8 5, 8 8, 5 8, 2 8))');
        assert.equal(toWKT(o), toWKT(makeValid(i, { method: 'structure', keepCollapsed: true })));
    });

    it('should throw on unsupported geometry type', () => {
        assert.throws(() => makeValid(fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)')), {
            name: 'GEOSError::UnsupportedOperationException',
            message: 'Curved types not supported in IsValidOp.',
        });
    });

});
