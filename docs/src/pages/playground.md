---
wrapperClassName: 'playground-page'
hide_table_of_contents: true
---

# Playground

Here you can play with the `GEOS.js`. It is already initialized and all functions are in the editor scope.<br/>
To display a variable, pass it to the `render(preview({}))` function at the bottom.

```js live noInline
const p1 = buffer(fromWKT('POINT (1 1)'), 10);
const p2 = buffer(point([ 6, 6 ]), 8, { quadrantSegments: 2 });
const u = union(p1, p2);
const a = area(u);

render(preview({ p1, p2, u, a }));
```
