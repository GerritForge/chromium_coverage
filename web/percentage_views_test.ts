/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import './test/test-setup';

import './coverage';

import {
  AbsoluteContentView,
  AbsoluteHeaderView,
  IncrementalContentView,
  IncrementalHeaderView,
} from './coverage-percentage-views';

import './coverage-percentage-views';

suite('coverage percentage views test', () => {
  let ahv: AbsoluteHeaderView;
  let ihv: IncrementalHeaderView;
  let acv: AbsoluteContentView;
  let icv: IncrementalContentView;

  setup(() => {
    ahv = document.createElement('absolute-header-view') as AbsoluteHeaderView;
    document.body.appendChild(ahv);
    ihv = document.createElement(
      'incremental-header-view'
    ) as IncrementalHeaderView;
    document.body.appendChild(ihv);
    acv = document.createElement(
      'absolute-content-view'
    ) as AbsoluteContentView;
    document.body.appendChild(acv);
    icv = document.createElement(
      'incremental-content-view'
    ) as IncrementalContentView;
    document.body.appendChild(icv);
  });

  teardown(() => {
    document.body.removeChild(ahv);
    document.body.removeChild(ihv);
    document.body.removeChild(acv);
    document.body.removeChild(icv);
  });

  test('absolute header view', async () => {
    await ahv.updateComplete;
    const root = ahv.shadowRoot ?? ahv;
    assert.equal(root.querySelector('div')!.textContent!.trim(), '|Cov|');
  });

  test('incremental header view', async () => {
    await ihv.updateComplete;
    const root = ihv.shadowRoot ?? ahv;
    assert.equal(root.querySelector('div')!.textContent!.trim(), 'ΔCov');
  });

  test('absolute content view', async () => {
    acv.changeNum = '12345';
    acv.patchRange = {patchNum: '2'};
    acv.path = 'base/test.cc';
    acv.provider = async (changeNum, path, patchNum) => {
      return {
        absolute: 30,
        incremental: 75,
      };
    };
    await acv.updateComplete;
    assert.equal(acv.percentageText, '30%');
  });

  test('absolute content view percentages are not available', async () => {
    acv.changeNum = '12345';
    acv.patchRange = {patchNum: '2'};
    acv.path = 'base/test.cc';
    acv.provider = async (changeNum, path, patchNum) => {
      return {};
    };
    await acv.updateComplete;
    assert.equal(acv.percentageText, '-');
  });

  test('incremental content view', async () => {
    icv.changeNum = '12345';
    icv.patchRange = {patchNum: '2'};
    icv.path = 'base/test.cc';
    icv.provider = async (changeNum, path, patchNum) => {
      return {
        absolute: 30,
        incremental: 75,
      };
    };

    await icv.updateComplete;
    assert.equal(icv.percentageText, '75%');
  });

  test('incremental content view percentage is not available', async () => {
    icv.changeNum = '12345';
    icv.patchRange = {patchNum: '2'};
    icv.path = 'base/test.cc';
    icv.provider = async (changeNum, path, patchNum) => {
      return {
        absolute: 30,
      };
    };

    await icv.updateComplete;
    assert.equal(icv.percentageText, '-');
  });
});
