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
bazel test web:karma_test
```


### Testing in Gerrit

For testing the plugin with Gerrit FE Dev Helper build the JavaScript bundle and copy it to the `plugins` folder:

```
bazel build plugins/code-coverage/web:code-coverage
cp -f bazel-bin/plugins/code-coverage/web/code-coverage.js plugins/code-coverage.js
```
and let the Dev Helper redirect from `.+/plugins/code-coverage/.*` to `http://localhost:8081/plugins_/plugins/code-coverage.js`


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

