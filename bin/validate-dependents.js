#!/usr/bin/env node

import {
  validateDependents,
  getDownloadCounts
} from '../src/validate-dependents.js';
import {promisify} from 'util';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const stringify = require('csv-stringify');
const dayjs = require('dayjs');

(async () => {
  const stringifyAsync = promisify(stringify);
  const [dependencyName, csvFilepath] = process.argv.slice(2);
  if (!dependencyName && csvFilepath) {
    console.error('Usage: validate-dependents.js <dependency-name> <path-to.csv>');
    process.exitCode = 1;
    return;
  }
  const startDate = dayjs()
    .subtract(1, 'month')
    .toDate();
  const data = await validateDependents(dependencyName, csvFilepath, {
    startDate
  });
  const dependencyDownloadCount = await getDownloadCounts(
    dependencyName,
    startDate
  );
  data.unshift({
    name: dependencyName,
    downloadCount: dependencyDownloadCount,
    description: 'DOWNLOAD COUNT FOR DEPENDENCY'
  });
  const output = await stringifyAsync(data, {
    header: true,
    columns: [
      'name',
      {key: 'downloadCount', header: 'downloads'},
      'description'
    ]
  });
  console.log(output);
})();
