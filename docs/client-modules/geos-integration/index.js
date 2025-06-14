import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import wasm_url from 'geos.js/geos_js.wasm';
import * as geos from './slim_geos.js';


if (ExecutionEnvironment.canUseDOM) {
    const start = performance.now();
    console.log(`initializing 'geos.js'...`);
    window.geosPromise = geos.initialize(fetch(wasm_url)).then(() => {
        console.log(`'geos.js' fetched, compiled and instantiated in ${(performance.now() - start).toFixed(1)}ms!`);
        console.log(`You can try 'geos.js' right here using the \`geos\` global, like \`geos.point([ 1, 1 ])\``);
        window.geos = geos;
        window.___params = Object.keys(geos);
        window.___args = Object.values(geos);
    });
}
