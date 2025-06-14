---
hide_table_of_contents: true
---

```js live title="Playground"
// Here you can play with the GEOS.js.
// It is already initialized and all functions are in the editor scope.
const p1 = buffer(fromWKT('POINT (1 1)'), 10);
const p2 = buffer(point([ 6, 6 ]), 8, { quadrantSegments: 2 });
const u = union(p1, p2);
const a = area(u);
```
