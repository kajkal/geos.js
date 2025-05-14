# GEOS.js

`GEOS.js` is a proof of concept of an easy-to-use geospatial library built on top of [GEOS](https://github.com/libgeos/geos).

The goal of this library is to connect [turf](https://github.com/Turfjs/turf)-like ease of use with the reliability of [GEOS](https://github.com/libgeos/geos) (used by [PostGIS](https://postgis.net/), [QGIS](https://qgis.org/), [GDAL](https://gdal.org/), [Shapely](https://github.com/shapely/shapely) and many others).


## Project structure

At the core is the C/C++ GEOS library compiled by Emscripten into WebAssembly with a custom ~~slightly over engineered~~ [GeoJSON integration](src/io/geosify.mts).
Memory management, pointers and other C/C++/Wasm related stuff are handled by JavaScript wrapper, which by exposing a clean API almost makes Wasm an implementation detail for downstream developers.


## Install

```shell
npm i geos.js
```

## Quick start

```javascript
import { initializeFromBase64, fromWKT, toWKT, toWKB, point, buffer, union } from 'geos.js';

// GEOS.js needs to be initialized (to compile Wasm code)
await initializeFromBase64();

// GEOS.js can read and write GeoJSON, WKT and WKB
const p1 = buffer(fromWKT('POINT (1 1)'), 10);
const p2 = buffer(point([ 6, 6 ]), 8, { quadrantSegments: 2 });
const u = union(p1, p2);

console.log(u.area()); // 375.3168319264665
console.log(toWKT(u, { precision: 1 })); // 'POLYGON ((10.8 -1, 10.2 -2.8, 9.3 -4.6, 8.1 -6.1, 6...
console.log(u.toJSON()); // { type: 'Polygon', coordinates: [ [ [ 10.807852804032304, -0.9509032...
console.log(JSON.stringify(u)); // '{"type":"Polygon","coordinates":[[[10.807852804032304,-0.950...

console.log(toWKB(fromWKT('POINT Z (1 2 3)'), { flavor: 'iso' })); // Uint8Array(29) [1,233,3,0,...
```

## License

`GEOS.js` is licensed under MIT License. `GEOS` is available under the terms of GNU Lesser General Public License (LGPL) 2.1.


## Related Projects

- The inspiration for this library was the [geos-wasm](https://github.com/chrispahm/geos-wasm) library created by [Christoph Pahmeyer](https://github.com/chrispahm)
- [Turf](https://github.com/Turfjs/turf) - pure JavaScript library with similar functionality
- [Shapely](https://github.com/shapely/shapely) - Python package build on top of GEOS
