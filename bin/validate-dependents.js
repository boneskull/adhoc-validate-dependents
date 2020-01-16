#!/usr/bin/env node

import {validateDependents} from '../src/validate-dependents.js';
import {promisify} from 'util';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const stringify = require('csv-stringify');

(async () => {
  const stringifyAsync = promisify(stringify);
  const [dependencyName, csvFilepath] = process.argv.slice(2);
  const data = await validateDependents(dependencyName, csvFilepath);
  const output = await stringifyAsync(data, {
    header: true,
    columns: [
      {key: 'dependentName', header: 'name'},
      {key: 'downloadCount', header: 'downloads'},
      'description'
    ]
  });
  console.log(output);
})();
