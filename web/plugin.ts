/** @license
 * Copyright 2020 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import '@gerritcodereview/typescript-api/gerrit';
import './coverage-percentage-views';
import {BaseCoverageComponent} from './coverage-percentage-views';
import {CoverageClient} from './coverage';
import {ChangeData} from '@gerritcodereview/typescript-api/checks';
import {EventType, PluginApi} from '@gerritcodereview/typescript-api/plugin';

window.Gerrit.install((plugin: PluginApi) => {
  const coverageClient = new CoverageClient(plugin);

  // Displays coverage metrics in file diff view.
  const annotationApi = plugin.annotationApi();
  annotationApi.setCoverageProvider(coverageClient.provideCoverageRanges);

  // provideCoverageRanges is only called when user expands diff view, and
  // to make sure coverage data can be fetched in time and show up
  // reliably, prefetch the coverage data in advance.
  plugin.on(EventType.SHOW_CHANGE, coverageClient.prefetchCoverageRanges);

  function onAttached(needsProvider = false) {
    return function (v: HTMLElement) {
      coverageClient.showPercentageColumns().then((show: boolean) => {
        const view = v as BaseCoverageComponent;
        view.shown = show;
        if (needsProvider) {
          view.provider = coverageClient.provideCoveragePercentages;
        }
      });
    };
  }
  // Displays coverage metrics on main page of the change.
  //
  // See link below to understand how dynamic endpoint reflect in the UI.
  // https://screenshot.googleplex.com/4Df9pEDTsxmpCmi
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-header',
      'absolute-header-view'
    )
    .onAttached(onAttached());
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-header',
      'incremental-header-view'
    )
    .onAttached(onAttached());
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-header',
      'absolute-unit-tests-header-view'
    )
    .onAttached(onAttached());
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-header',
      'incremental-unit-tests-header-view'
    )
    .onAttached(onAttached());

  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-content',
      'absolute-content-view'
    )
    .onAttached(onAttached(true));
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-content',
      'incremental-content-view'
    )
    .onAttached(onAttached(true));
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-content',
      'absolute-unit-tests-content-view'
    )
    .onAttached(onAttached(true));
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-content',
      'incremental-unit-tests-content-view'
    )
    .onAttached(onAttached(true));

  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-summary',
      'absolute-summary-view'
    )
    .onAttached(onAttached());
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-summary',
      'incremental-summary-view'
    )
    .onAttached(onAttached());
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-summary',
      'absolute-unit-tests-summary-view'
    )
    .onAttached(onAttached());
  plugin
    .registerDynamicCustomComponent(
      'change-view-file-list-summary',
      'incremental-unit-tests-summary-view'
    )
    .onAttached(onAttached());

  // Displays warnings for low coverage.
  const experiments = window.ENABLED_EXPERIMENTS || [];
  if (experiments.includes('UiFeature__ci_reboot_checks_coverage')) {
    const checksApi = plugin.checks();
    checksApi.register({
      fetch: (changeData: ChangeData) =>
        coverageClient.mayBeShowLowCoverageWarning(
          changeData.changeNumber,
          changeData.patchsetNumber
        ),
    });
  }
});
