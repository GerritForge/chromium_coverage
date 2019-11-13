// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.googlesource.chromium.plugins.coverage;

import static com.google.gerrit.server.project.ProjectResource.PROJECT_KIND;

import com.google.gerrit.extensions.registration.DynamicSet;
import com.google.gerrit.extensions.restapi.RestApiModule;
import com.google.gerrit.extensions.webui.JavaScriptPlugin;
import com.google.gerrit.extensions.webui.WebUiPlugin;

public class CoverageModule extends RestApiModule {

  @Override
  protected void configure() {
    // Point to the JavaScript that provides the main functionality of this plugin.
    DynamicSet.bind(binder(), WebUiPlugin.class)
        .toInstance(new JavaScriptPlugin("chromium-coverage.html"));

    // Register the config endpoint used by the JavaScript client code.
    get(PROJECT_KIND, "config").to(GetConfig.class);
  }
}
