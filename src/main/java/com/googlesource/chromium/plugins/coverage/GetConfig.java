// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

package com.googlesource.chromium.plugins.coverage;

import com.google.gerrit.extensions.restapi.Response;
import com.google.gerrit.extensions.restapi.RestReadView;
import com.google.gerrit.server.config.PluginConfig;
import com.google.gerrit.server.config.PluginConfigFactory;
import com.google.gerrit.server.project.NoSuchProjectException;
import com.google.gerrit.server.project.ProjectResource;
import com.google.gson.annotations.SerializedName;
import com.google.inject.Inject;
import com.google.inject.Singleton;

@Singleton
class GetConfig implements RestReadView<ProjectResource> {
  private final PluginConfigFactory config;

  @Inject
  GetConfig(PluginConfigFactory config) {
    this.config = config;
  }

  @Override
  public Response<CoverageConfig> apply(ProjectResource project) throws NoSuchProjectException {
    PluginConfig coverageConfigForProject =
        this.config.getFromProjectConfig(project.getNameKey(), "code-coverage");
    CoverageConfig result = new CoverageConfig();
    result.enabled = coverageConfigForProject.getBoolean("enabled", false);
    result.endpoint = coverageConfigForProject.getString("endpoint", "");

    return Response.ok(result);
  }

  static class CoverageConfig {
    @SerializedName("enabled")
    Boolean enabled;

    @SerializedName("endpoint")
    String endpoint;
  }
}
