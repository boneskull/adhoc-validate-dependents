# validate-dependents

> For posterity

This is an adhoc script which requires (as arguments):

1. The name of an npm package (the dependency)
2. A path to a CSV file containing package names in the first column (the dependents)

It checks each of those package names to see if the latest version of a dependent _depends on_ the dependency.  For example:

```bash
$ bin/validate-dependents.js mocha /path/to/some.csv
```

It will output a CSV with fields `name` (the dependent name), `downloadCount` (downloads in the past month), and `description`.

## Notes

- This is not intended to be published to npm, because it's of dubious value to anybody else in its current state
- To generalize this, its I/O would need to work with something other than CSV
- The API contained therein accepts options object containing:
  1. `limit` (only process the first `limit` dependents in the CSV; default is `Infinity`)
  2. `minDownloadCount` (dependents must have at least this many downloads in the past month to be included in the output; default is `1_000_000`)
  3. `concurrent` (set this to a low integer to be nice to the registry; defaults to `Infinity`, which is mean)
- This requires Node.js v13.2.0 or later to run without the `--experimental-modules` flag; Node.js v12.0.0 or later with it.

## License

Copyright © 2020 Christopher Hiller.  Licensed Apache-2.0

