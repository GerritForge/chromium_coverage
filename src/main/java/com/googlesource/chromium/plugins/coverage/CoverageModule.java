// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.googlesource.chromium.plugins.coverage;

import static com.google.gerrit.server.project.ProjectResource.PROJECT_KIND;

import com.google.gerrit.extensions.annotations.Exports;
import com.google.gerrit.extensions.api.projects.ProjectConfigEntryType;
import com.google.gerrit.extensions.registration.DynamicSet;
import com.google.gerrit.extensions.restapi.RestApiModule;
import com.google.gerrit.extensions.webui.JavaScriptPlugin;
import com.google.gerrit.extensions.webui.WebUiPlugin;
import com.google.gerrit.server.config.ProjectConfigEntry;

public class CoverageModule extends RestApiModule {

  static final String KEY_CODE_COVERAGE = "code-coverage";

  @Override
  protected void configure() {
    // Point to the JavaScript that provides the main functionality of this plugin.
    DynamicSet.bind(binder(), WebUiPlugin.class)
        .toInstance(new JavaScriptPlugin("chromium-coverage.js"));

    // Register the config endpoint used by the JavaScript client code.
    get(PROJECT_KIND, "config").to(GetConfig.class);

    // Configure UI element to be exposed on the project view
    bind(ProjectConfigEntry.class)
        .annotatedWith(Exports.named(KEY_CODE_COVERAGE))
        .toInstance(
            new ProjectConfigEntry(
                "Show Code Coverage",
                "false",
                ProjectConfigEntryType.BOOLEAN,
                null,
                false,
                "Show code coverage in diff view."));
  }
}
