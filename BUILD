load("//tools/bzl:plugin.bzl", "gerrit_plugin")
load("//tools/bzl:js.bzl", "polygerrit_plugin")

gerrit_plugin(
    name = "chromium_coverage",
    srcs = glob(["src/main/java/**/*.java"]),
    manifest_entries = [
        "Gerrit-PluginName: chromium-coverage",
        "Gerrit-Module: com.googlesource.chromium.plugins.coverage.CoverageModule",
        "Implementation-Title: Chromium-coverage plugin",
        "Implementation-URL: https://chromium.googlesource.com/infra/gerrit-plugins/code-coverage",
    ],
    resources = glob(["src/main/**/*"]),
)

polygerrit_plugin(
    name = "chromium_coverage_ui",
    srcs = glob([
        "src/main/resources/static/*.html",
        "src/main/resources/static/*.js",
    ]),
    app = "src/main/resources/static/chromium-coverage.html",
)
