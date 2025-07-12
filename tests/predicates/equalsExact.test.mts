import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeForTest } from '../tests-utils.mjs';
import type { Geometry } from '../../src/geom/Geometry.mjs';
import { lineString, multiLineString } from '../../src/helpers/helpers.mjs';
import { equalsExact } from '../../src/predicates/equalsExact.mjs';
import { fromWKT } from '../../src/io/WKT.mjs';


describe('equalsExact', () => {

    let a: Geometry, b: Geometry;

    before(async () => {
        await initializeForTest();
    });

    it('should return whether two geometries are equal on the XY plane', () => {
        a = lineString([ [ 0, 0 ], [ 8, 0 ] ]);

        b = lineString([ [ 0, 0 ], [ 8, 0 ] ]);
        assert.equal(equalsExact(a, b, 0), true);

        b = lineString([ [ 0, 0, 100 ], [ 8, 0, 102 ] ]); // Z and M are ignored
        assert.equal(equalsExact(a, b, 0), true);

        b = lineString([ [ 0, 0 ], [ 10, 0 ] ]);
        assert.equal(equalsExact(a, b, 2), true);

        b = multiLineString([ [ [ 0, 0 ], [ 8, 0 ] ] ]); // types are checked
        assert.equal(equalsExact(a, b, 0), false);

        b = lineString([ [ 0, 0 ], [ 4, 0 ], [ 8, 0 ] ]);
        assert.equal(equalsExact(a, b, 0), false);

        b = lineString([ [ 8, 0 ], [ 0, 0 ] ]);
        assert.equal(equalsExact(a, b, 0), false);

        // NaN values are not considered equal
        a = lineString([ [ 0, NaN ], [ 1, NaN ] ]);
        b = lineString([ [ 0, NaN ], [ 1, NaN ] ]);
        assert.equal(equalsExact(a, b, 0), false);
    });

    it('should not throw on curved geometries', () => {
        a = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        b = fromWKT('CIRCULARSTRING (0 0, 1 1, 2 0)');
        assert.equal(equalsExact(a, b, 0), true);

        b = fromWKT('CIRCULARSTRING (0 0, 1 1, -2 0)');
        assert.equal(equalsExact(a, b, 0), false);
    });

});
