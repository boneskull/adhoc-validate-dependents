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
 * Check a dependency for current dependents
 * @param {string} dependencyName - Name of dependency
 * @param {string} csvFilepath - Path to a CSV file
 * @param {Partial<ValidateDependentsOptions>} [opts]
 */
export async function validateDependents(
  dependencyName,
  csvFilepath,
  {limit = Infinity, minDownloadCount = 1_000_000, concurrency = Infinity} = {}
) {
  const raw = await fs.readFile(csvFilepath, 'utf8');
  const csv = await parseAsync(raw);

  const startDate = dayjs()
    .subtract(1, 'month')
    .toDate();
  const endDate = new Date();
  return (
    await asyncPool(
      concurrency,
      csv.slice(0, limit).map(([dependentName]) => ({
        dependencyName,
        dependentName
      })),
      async ({dependencyName, dependentName}) => {
        const manifest = await pacote.manifest(`${dependentName}@latest`, {
          fullMetadata: true
        });

        const spec =
          get(manifest, `dependencies.${dependencyName}`) ||
          get(manifest, `devDependencies.${dependencyName}`) ||
          get(manifest, `bundledDependencies.${dependencyName}`) ||
          get(manifest, `bundleDependencies.${dependencyName}`) ||
          get(manifest, `peerDependencies.${dependencyName}`);

        if (spec) {
          const data = await npmDownloadCounts(
            dependentName,
            startDate,
            endDate
          );
          const downloadCount = data.reduce(
            /** @param {number} acc */
            (acc, {count}) => acc + count,
            0
          );
          return {
            dependentName,
            downloadCount,
            description: manifest.description
          };
        }
      }
    )
  )
    .filter(result => result && result.downloadCount >= minDownloadCount)
    .sort((a, b) => b.downloadCount - a.downloadCount);
}

/**
 * @typedef {Object} ValidateDependentsOptions
 * @property {number} limit - Process this many dependents, then stop
 * @property {number} concurrency - Restrict to this many concurrent operations
 * @property {number} minDownloadCount - Filter out dependents with fewer than this number
 */
