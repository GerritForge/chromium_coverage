load("//tools/bzl:plugin.bzl", "gerrit_plugin")
load("//tools/bzl:js.bzl", "polygerrit_plugin")
load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")

gerrit_plugin(
    name = "chromium_coverage",
    srcs = glob(["src/main/java/**/*.java"]),
    dir_name = "code-coverage",
    manifest_entries = [
        "Gerrit-PluginName: chromium-coverage",
        "Gerrit-Module: com.googlesource.chromium.plugins.coverage.CoverageModule",
        "Implementation-Title: Chromium-coverage plugin",
        "Implementation-URL: https://chromium.googlesource.com/infra/gerrit-plugins/code-coverage",
    ],
    resources = glob(["src/main/resources/**/*"]),
)

rollup_bundle(
    name = "chromium-coverage-bundle",
    srcs = glob([
        "src/main/resources/**/*.js",
    ]),
    entry_point = "src/main/resources/static/chromium-coverage.js",
    rollup_bin = "//tools/node_tools:rollup-bin",
    sourcemap = "hidden",
    deps = [
        "@tools_npm//rollup-plugin-node-resolve",
    ],
)

polygerrit_plugin(
    name = "chromium_coverage_ui",
    app = "chromium-coverage-bundle.js",
    plugin_name = "chromium-coverage",
)
