# Github Respository Explorer

Empty Typescript project

## How to:
Please see [Launch config]().vscode/launch.json) for example invocation
```.env
GITHUB_USER=<GIHUT_USER>
GITHUB_TOKEN=<GITHUB_TOKEN>
ORG=<Github organisation>
LANGUAGE=Python
LINE_PATTERN=<line matching pattern: defaults to .*>
FILE_PATTERN=requirements/*.txt
```
### Run this project

1.  Build the code: `npm run build`
1.  Run it! `npm start`

Note that the `lint` script is run prior to `build`. Auto-fixable linting or formatting errors may be fixed by running `npm run fix`.

### Create and run tests

1.  Add tests by creating files with the `.tests.ts` suffix
1.  Run the tests: `npm t`
1.  Test coverage can be viewed at `/coverage/lcov-report/index.html`

---

Generated with [generator-ts-console](https://www.npmjs.com/package/generator-ts-console)
