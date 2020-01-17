import {promisify} from 'util';
import {promises as fs} from 'fs';
import asyncPool from 'tiny-async-pool';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const dayjs = require('dayjs');
const parse = require('csv-parse');
const get = require('lodash.get');
const npmDownloadCounts = require('npm-download-counts');
const pacote = require('pacote');
const parseAsync = promisify(parse);

/**
 * Get the project manifest from npm (its `package.json` w/ other stuff)
 * @param {string} name - Name of project for which to fetch manifest
 */
async function getManifest(name) {
  return pacote.manifest(`${name}@latest`, {
    fullMetadata: true
  });
}

/**
 * Get d/l counts for a package over a period of time
 * @param {string} name - Name of package for which to get d/l counts
 * @param {Date} startDate - Start date of download counts
 * @param {Date} [endDate] - End date of download counts (defaults to today)
 */
export async function getDownloadCounts(name, startDate, endDate = new Date()) {
  /** @type {{count: number}[]} */
  const data = await npmDownloadCounts(name, startDate, endDate);
  return data.reduce((acc, {count}) => acc + count, 0);
}

/**
 * Check a dependency for current dependents
 * @param {string} dependencyName - Name of dependency
 * @param {string} csvFilepath - Path to a CSV file
 * @param {Partial<ValidateDependentsOptions>} [opts] - Options
 */
export async function validateDependents(
  dependencyName,
  csvFilepath,
  {
    limit = Infinity,
    minDownloadCount = 1_000_000,
    concurrency = Infinity,
    startDate = dayjs()
      .subtract(1, 'month')
      .toDate(),
    endDate = new Date()
  } = {}
) {
  const raw = await fs.readFile(csvFilepath, 'utf8');
  const csv = await parseAsync(raw);

  return (
    await asyncPool(
      concurrency,
      csv.slice(0, limit).map(([dependentName]) => dependentName),
      async dependentName => {
        const manifest = await getManifest(dependentName);

        const spec =
          get(manifest, `dependencies.${dependencyName}`) ||
          get(manifest, `devDependencies.${dependencyName}`) ||
          get(manifest, `bundledDependencies.${dependencyName}`) ||
          get(manifest, `bundleDependencies.${dependencyName}`) ||
          get(manifest, `peerDependencies.${dependencyName}`);

        if (spec) {
          const downloadCount = await getDownloadCounts(
            dependentName,
            startDate,
            endDate
          );
          return {
            name: dependentName,
            downloadCount,
            description: manifest.description
          };
        }
      }
    )
  )
    .filter(result => get(result, 'downloadCount') >= minDownloadCount)
    .sort((a, b) => b.downloadCount - a.downloadCount);
}

/**
 * @typedef {Object} ValidateDependentsOptions
 * @property {number} limit - Process this many dependents, then stop
 * @property {number} concurrency - Restrict to this many concurrent operations
 * @property {number} minDownloadCount - Filter out dependents with fewer than this number
 * @property {Date} startDate - Date from which to get download counts
 * @property {Date} endDate - Date to which to get download counts
 */
