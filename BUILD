load("//tools/js:eslint.bzl", "plugin_eslint")
load("//tools/bzl:js.bzl", "gerrit_js_bundle", "karma_test")
load("@npm//@bazel/typescript:index.bzl", "ts_config", "ts_project")
load("//tools/bzl:plugin.bzl", "gerrit_plugin")

gerrit_plugin(
    name = "chromium_coverage",
    srcs = glob(["src/main/java/**/*.java"]),
    manifest_entries = [
        "Gerrit-PluginName: chromium-coverage",
        "Gerrit-Module: com.googlesource.chromium.plugins.coverage.CoverageModule",
        "Implementation-Title: Chromium-coverage plugin",
        "Implementation-URL: https://chromium.googlesource.com/infra/gerrit-plugins/code-coverage",
    ],
    resources = glob(["web/*"]),
)
