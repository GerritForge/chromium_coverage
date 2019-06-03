# Chrome/Chromium Code Coverage Plugin

The purpose of this plugin is to surface code coverage data on Gerrit UI.

## Development

### Checking out the code

To check out the chromium-coverage plugin code:

```
git clone https://chromium.googlesource.com/infra/gerrit-plugins/code-coverage
```

### Running the tests

The unit tests of the plugin are [web-component-tester unit tests][1].
Dependencies are specified in bower.json and can be installed by running
`bower install` in this directory. This requires [bower to be
installed](https://bower.io/#install-bower).

To run the tests, run `wct` from this directory.  See `wct --help`
for more options.

## To use with the local testsite

ln -s /path/to/chromium-coverage.html plugins/

[1]: https://www.polymer-project.org/1.0/docs/tools/tests