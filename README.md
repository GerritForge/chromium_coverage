# Chrome/Chromium Code Coverage Plugin

The purpose of this plugin is to surface code coverage data on Gerrit UI.

## Development

### Checking out the code

To check out the chromium-coverage plugin code:

```
git clone https://chromium.googlesource.com/infra/gerrit-plugins/code-coverage
```

### Running the tests

```
npm run wct-test
```

## To use with the local testsite

ln -s /path/to/chromium-coverage.html plugins/

## Project Configuration

This plugin is configured via the `project.config` file present in the repo's
`refs/meta/config` ref. This file uses git config format. By default, the
coverage percentage columns in the file list are hidden to avoid visual
distraction in unrelated projects, and in order to have them displayed, please
add the following config:
```
[plugin "code-coverage"]
  enabled = true
```

The code-coverage data is fetched from an external endpoint URL, configurable
on a per-project basis via the `endpoint` setting in the code-coverage section of
the `project.config`.

By default, the data is fetched from one of the Chromium project endpoints.

Example for serving the code-coverage data for local development with the
code-coverage plugin:

```
[plugin "code-coverage"]
  endpoint = http://localhost:8080/static/test-code-coverage.json
```

[1]: https://www.polymer-project.org/1.0/docs/tools/tests
