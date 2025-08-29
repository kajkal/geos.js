# GEOS.js

(WIP) `GEOS.js` is an easy-to-use geospatial library built on top of [GEOS](https://github.com/libgeos/geos).

The goal of this library is to connect [turf](https://github.com/Turfjs/turf)-like ease of use with the reliability of [GEOS](https://github.com/libgeos/geos) (used by [PostGIS](https://postgis.net/), [QGIS](https://qgis.org/), [GDAL](https://gdal.org/), [Shapely](https://github.com/shapely/shapely) and many others).


## Try it out

Try out `GEOS.js` in the interactive [playground](https://kajkal.github.io/geos.js/playground)!

You can also check out [API Documentation](https://kajkal.github.io/geos.js/docs/category/setup) for live examples!


## Project structure

At the core is the C/C++ GEOS library compiled by Emscripten into WebAssembly with a custom ~~slightly over engineered~~ [GeoJSON integration](src/io/geosify.mts).
Memory management, pointers and other C/C++/Wasm related stuff are handled by JavaScript wrapper, which by exposing a clean API almost makes Wasm an implementation detail for downstream developers.


## Install

```shell
npm i geos.js
```

## Quick start

```javascript
import { initializeFromBase64, fromWKT, toWKT, toWKB, point, area, buffer, union } from 'geos.js';

// GEOS.js needs to be initialized (to compile Wasm code)
await initializeFromBase64();

// GEOS.js can read and write GeoJSON, WKT and WKB
const p1 = buffer(fromWKT('POINT (1 1)'), 10);
const p2 = buffer(point([ 6, 6 ]), 8, { quadrantSegments: 2 });
const u = union(p1, p2);

console.log(area(u)); // 375.3168319264665
console.log(toWKT(u, { precision: 1 })); // 'POLYGON ((10.8 -1, 10.2 -2.8, 9.3 -4.6, 8.1 -6.1, 6...
console.log(u.toJSON()); // { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ [ 10....
console.log(JSON.stringify(u)); // '{"type":"Feature","geometry":{"type":"Polygon","coordinates"...

console.log(toWKB(fromWKT('POINT Z (1 2 3)'), { flavor: 'iso' })); // Uint8Array(29) [1,233,3,0,...
```


## Bundle size

The main components of the library are a Wasm file and a JavaScript wrapper.

They can be combined into a single .js file where .wasm file data is embedded as Base64 string:

| file           |    size | gzipped |
|----------------|--------:|--------:|
| `index.min.js` | 1391 KB | 466 KB |

or loaded separately:

| file                |    size | gzipped |
|---------------------|--------:|--------:|
| `geos_js.wasm` | 1028 KB | 326 KB |
| `index-slim.min.js` | 20 KB | 6 KB |

`index-slim` here is a complete JavaScript wrapper, but
without [initializeFromBase64](https://kajkal.github.io/geos.js/docs/api/setup/initializeFromBase64) function.


## License

`GEOS.js` is licensed under MIT License. `GEOS` is available under the terms of GNU Lesser General Public License (LGPL) 2.1.


## Related Projects

- The inspiration for this library was the [geos-wasm](https://github.com/chrispahm/geos-wasm) library created by [Christoph Pahmeyer](https://github.com/chrispahm)
- [Turf](https://github.com/Turfjs/turf) - pure JavaScript library with similar functionality
- [Shapely](https://github.com/shapely/shapely) - Python package build on top of GEOS
