/**
 * @license
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import './test/test-setup';

import {PluginApi} from '@gerritcodereview/typescript-api/plugin';

import {
  CoverageRange,
  CoverageType,
  Side,
} from '@gerritcodereview/typescript-api/diff';

import {
  ChangeInfo,
  RevisionInfo,
} from '@gerritcodereview/typescript-api/rest-api';

import './coverage';

import {CoverageClient, CoverageResponse, PercentageData} from './coverage';

suite('coverage test', () => {
  // Sample change info used for testing.
  const sampleChangeInfo = {
    host: 'chromium-review.googlesource.com',
    project: 'chromium/src',
    changeNum: 12345,
    patchNum: 2,
  };

  // Sample coverage lines response from service; used for testing.
  const sampleLinesResponse: CoverageResponse = {
    data: {
      files: [
        {
          path: 'base/test.cc',
          lines: [
            {
              line: 10,
              count: 10,
            },
            {
              line: 11,
              count: 0,
            },
            {
              line: 12,
              count: 0,
            },
          ],
        },
      ],
    },
  };

  // Sample coverage ranges that match with the lines response.
  const sampleCoverageRanges: {[path: string]: CoverageRange[]} = {
    'base/test.cc': [
      {
        side: Side.RIGHT,
        type: CoverageType.COVERED,
        code_range: {
          start_line: 10,
          end_line: 10,
        },
      },
      {
        side: Side.RIGHT,
        type: CoverageType.NOT_COVERED,
        code_range: {
          start_line: 11,
          end_line: 12,
        },
      },
    ],
  };

  // Sample coverage percentages response from service; used for testing.
  const samplePercentagesResponse: CoverageResponse = {
    data: {
      files: [
        {
          path: 'base/test.cc' as string,
          absolute_coverage: {
            covered: 3,
            total: 10,
          },
          incremental_coverage: {
            covered: 3,
            total: 4,
          },
        },
      ],
    },
  };

  // Sample coverage percentages that match with the percentages response.
  const sampleCoveragePercentages: {[path: string]: PercentageData} = {
    'base/test.cc': {
      absolute: 30,
      incremental: 75,
    },
  };

  let coverageClient: CoverageClient;
  let fetchStub = sinon.stub(window, 'fetch');
  fetchStub.restore();

  setup(() => {
    fetchStub = sinon.stub(window, 'fetch');
    coverageClient = new CoverageClient((null as unknown) as PluginApi);
  });

  teardown(() => {
    fetchStub.restore();
  });

  test('get normalized host', () => {
    assert.equal(
      'chromium-review.googlesource.com',
      coverageClient.getNormalizedHost('chromium-review.googlesource.com')
    );
    assert.equal(
      'chromium-review.googlesource.com',
      coverageClient.getNormalizedHost(
        'canary-chromium-review.googlesource.com'
      )
    );
  });

  test('parse project name from gerrit url', () => {
    assert.equal(
      'chromium/src',
      coverageClient.parseProjectFromPathName('/c/chromium/src/+/1369646')
    );
    assert.equal(
      'chromium/src',
      coverageClient.parseProjectFromPathName('/c/chromium/src/+/1369646')
    );
    assert.equal(
      'chromium/src',
      coverageClient.parseProjectFromPathName('/c/chromium/src/+/1369646/3')
    );
    assert.equal(
      'chromium/src',
      coverageClient.parseProjectFromPathName('/c/chromium/src/+/1369646/3/')
    );
    assert.equal(
      'chromium/src',
      coverageClient.parseProjectFromPathName(
        '/c/chromium/src/+/1369646/3/base/test.cc'
      )
    );
    assert.equal(
      'chromium/src',
      coverageClient.parseProjectFromPathName(
        '/c/chromium/src/+/1369646/3/base/base/test.cc/'
      )
    );
  });

  test('fetch coverage lines for chromium', async () => {
    const response = new window.Response(JSON.stringify(sampleLinesResponse), {
      status: 200,
    });
    fetchStub.returns(Promise.resolve(response));
    const responseJson = await coverageClient.fetchCoverageJsonData(
      sampleChangeInfo,
      'lines'
    );
    assert.equal(
      'https://findit-for-me.appspot.com/coverage/api/' +
        'coverage-data?host=chromium-review.googlesource.com&' +
        'project=chromium%2Fsrc&change=12345&patchset=2&' +
        'type=lines&format=json&concise=1',
      fetchStub.getCall(0).args[0]
    );
    assert.deepEqual(sampleLinesResponse, responseJson);
  });

  test('fetch coverage percentanges for chromium', async () => {
    const response = new window.Response(JSON.stringify(sampleLinesResponse), {
      status: 200,
    });
    fetchStub.returns(Promise.resolve(response));
    const responseJson = await coverageClient.fetchCoverageJsonData(
      sampleChangeInfo,
      'percentages'
    );
    assert.equal(
      'https://findit-for-me.appspot.com/coverage/api/' +
        'coverage-data?host=chromium-review.googlesource.com&' +
        'project=chromium%2Fsrc&change=12345&patchset=2&' +
        'type=percentages&format=json&concise=1',
      fetchStub.getCall(0).args[0]
    );
    assert.deepEqual(sampleLinesResponse, responseJson);
  });

  test('fetch coverage lines for libassistant', async () => {
    const response = new window.Response(JSON.stringify(sampleLinesResponse), {
      status: 200,
    });
    fetchStub.returns(Promise.resolve(response));
    const responseJson = await coverageClient.fetchCoverageJsonData(
      {
        host: 'libassistant-internal-review.googlesource.com',
        project: 'libassistant/internal',
        changeNum: 12345,
        patchNum: 2,
      },
      'lines'
    );
    assert.equal(
      'https://gob-coverage.googleplex.com/coverage/api/' +
        'coverage-data?host=libassistant-internal-review.' +
        'googlesource.com&project=libassistant%2Finternal&' +
        'change=12345&patchset=2&type=lines&format=json&concise=1',
      fetchStub.getCall(0).args[0]
    );
    assert.deepEqual(sampleLinesResponse, responseJson);
  });

  test('fetch coverage lines for unknown host', async () => {
    const response = new window.Response(JSON.stringify(sampleLinesResponse), {
      status: 200,
    });
    fetchStub.returns(Promise.resolve(response));
    const responseJson = await coverageClient.fetchCoverageJsonData(
      {
        host: 'unknown-review.googlesource.com',
        project: 'unknown/src',
        changeNum: 12345,
        patchNum: 2,
      },
      'lines'
    );
    assert.equal(
      'https://findit-for-me.appspot.com/coverage/api/' +
        'coverage-data?host=unknown-review.googlesource.com&' +
        'project=unknown%2Fsrc&change=12345&patchset=2&' +
        'type=lines&format=json&concise=1',
      fetchStub.getCall(0).args[0]
    );
    assert.deepEqual(sampleLinesResponse, responseJson);
  });

  test('parse coverage ranges', () => {
    const coverageRanges =
      coverageClient.convertResponseJsonToCoverageRanges(sampleLinesResponse);
    assert.deepEqual(sampleCoverageRanges, coverageRanges);
  });

  test('parse coverage percentages', () => {
    const coveragePercentages =
      coverageClient.convertResponseJsonToCoveragePercentages(
        samplePercentagesResponse
      );
    assert.deepEqual(sampleCoveragePercentages, coveragePercentages);
  });

  test('coverage data are cached', async () => {
    const gnhStub = sinon.stub(coverageClient, 'getNormalizedHost');
    const ppfpnStub = sinon.stub(coverageClient, 'parseProjectFromPathName');
    const fcjdStub = sinon.stub(coverageClient, 'fetchCoverageJsonData');
    gnhStub.returns(sampleChangeInfo.host);
    ppfpnStub.returns(sampleChangeInfo.project);

    coverageClient.coverageData = {
      changeInfo: sampleChangeInfo,
      rangesPromise: new Promise((resolve, reject) => {
        resolve(sampleCoverageRanges);
      }),
      percentagesPromise: new Promise((resolve, reject) => {
        resolve(sampleCoveragePercentages);
      }),
    };

    const ranges = await coverageClient.provideCoverageRanges(
      12345,
      'base/test.cc',
      undefined,
      2
    );
    assert.equal(false, fcjdStub.called);
    assert.deepEqual(sampleCoverageRanges['base/test.cc'], ranges);

    const percentages = await coverageClient.provideCoveragePercentages(
      '12345',
      'base/test.cc',
      '2'
    );
    assert.equal(false, fcjdStub.called);
    assert.deepEqual(sampleCoveragePercentages['base/test.cc'], percentages);
    gnhStub.restore();
    ppfpnStub.restore();
    fcjdStub.restore();
  });

  test('coverage ranges are not cached', async () => {
    const gnhStub = sinon.stub(coverageClient, 'getNormalizedHost');
    const ppfpnStub = sinon.stub(coverageClient, 'parseProjectFromPathName');
    const fcjdStub = sinon.stub(coverageClient, 'fetchCoverageJsonData');
    gnhStub.returns(sampleChangeInfo.host);
    ppfpnStub.returns(sampleChangeInfo.project);
    fcjdStub
      .withArgs(sampleChangeInfo, 'lines')
      .returns(Promise.resolve(sampleLinesResponse));

    const ranges = await coverageClient.provideCoverageRanges(
      12345,
      'base/test.cc',
      undefined,
      2
    );

    assert.deepEqual(sampleChangeInfo, coverageClient.coverageData!.changeInfo);
    assert.deepEqual(sampleCoverageRanges['base/test.cc'], ranges);

    gnhStub.restore();
    ppfpnStub.restore();
    fcjdStub.restore();
  });

  test('coverage percentages are not cached', async () => {
    const gnhStub = sinon.stub(coverageClient, 'getNormalizedHost');
    const ppfpnStub = sinon.stub(coverageClient, 'parseProjectFromPathName');
    const fcjdStub = sinon.stub(coverageClient, 'fetchCoverageJsonData');
    gnhStub.returns(sampleChangeInfo.host);
    ppfpnStub.returns(sampleChangeInfo.project);
    fcjdStub
      .withArgs(sampleChangeInfo, 'percentages')
      .returns(Promise.resolve(samplePercentagesResponse));

    const percentages = await coverageClient.provideCoveragePercentages(
      '12345',
      'base/test.cc',
      '2'
    );
    assert.deepEqual(sampleChangeInfo, coverageClient.coverageData!.changeInfo);
    assert.deepEqual(sampleCoveragePercentages['base/test.cc'], percentages);

    gnhStub.restore();
    ppfpnStub.restore();
    fcjdStub.restore();
  });

  test('incremental percentage is not available', async () => {
    const response = {
      data: {
        files: [
          {
            path: 'base/test.cc' as string,
            absolute_coverage: {
              covered: 3,
              total: 10,
            },
          },
        ],
      },
    };

    const gnhStub = sinon.stub(coverageClient, 'getNormalizedHost');
    const ppfpnStub = sinon.stub(coverageClient, 'parseProjectFromPathName');
    const fcjdStub = sinon.stub(coverageClient, 'fetchCoverageJsonData');
    gnhStub.returns(sampleChangeInfo.host);
    ppfpnStub.returns(sampleChangeInfo.project);
    fcjdStub
      .withArgs(sampleChangeInfo, 'percentages')
      .returns(Promise.resolve(response));

    const percentages = await coverageClient.provideCoveragePercentages(
      '12345',
      'base/test.cc',
      '2'
    );
    assert.deepEqual(sampleChangeInfo, coverageClient.coverageData!.changeInfo);
    assert.deepEqual({absolute: 30}, percentages);

    gnhStub.restore();
    ppfpnStub.restore();
    fcjdStub.restore();
  });

  test('prefetch coverage ranges', async () => {
    const gnhStub = sinon.stub(coverageClient, 'getNormalizedHost');
    const fcjdStub = sinon.stub(coverageClient, 'fetchCoverageJsonData');
    gnhStub.returns(sampleChangeInfo.host);
    fcjdStub
      .withArgs(sampleChangeInfo, 'lines')
      .returns(Promise.resolve(sampleLinesResponse));

    coverageClient.prefetchCoverageRanges(
      {project: 'chromium/src', _number: 12345} as unknown as ChangeInfo,
      {_number: 2} as unknown as RevisionInfo
    );

    assert.deepEqual(sampleChangeInfo, coverageClient.coverageData!.changeInfo);
    assert.deepEqual(
      sampleCoverageRanges,
      await coverageClient.coverageData!.rangesPromise
    );

    gnhStub.restore();
    fcjdStub.restore();
  });

  test('invalid patchset number', async () => {
    const gnhStub = sinon.stub(coverageClient, 'getNormalizedHost');
    const ppfpnStub = sinon.stub(coverageClient, 'parseProjectFromPathName');
    const fcjdStub = sinon.stub(coverageClient, 'fetchCoverageJsonData');
    gnhStub.returns(sampleChangeInfo.host);
    ppfpnStub.returns(sampleChangeInfo.project);

    await coverageClient.provideCoverageRanges(
      12345,
      'base/test.cc',
      undefined,
      undefined
    );
    assert.equal(false, fcjdStub.called);

    await coverageClient.provideCoveragePercentages(
      '12345',
      'base/test.cc',
      '-1'
    );
    assert.equal(false, fcjdStub.called);

    gnhStub.restore();
    ppfpnStub.restore();
    fcjdStub.restore();
  });

  // This test tests the scenario that if two requests were issued to fetch
  // coverage ranges for different change/patchset, the eventual coverage
  // ranges won't be overwritten incorrectly.
  test('racing condition between multiple fetches', async () => {
    const changeInfo1 = JSON.parse(JSON.stringify(sampleChangeInfo));
    changeInfo1.patchNum = 1;
    const changeInfo2 = JSON.parse(JSON.stringify(sampleChangeInfo));
    changeInfo2.patchNum = 2;

    const ranges1: {[path: string]: CoverageRange[]} = {
      'base/test.cc': [
        {
          side: Side.RIGHT,
          type: CoverageType.NOT_COVERED,
          code_range: {
            start_line: 10,
            end_line: 10,
          },
        },
      ],
    };
    const fetchPromise1 = new Promise<{[path: string]: CoverageRange[]}>(
      (resolve, reject) => {
        setTimeout(() => {
          resolve(ranges1);
        }, 100);
      }
    );

    const ranges2: {[path: string]: CoverageRange[]} = {
      'base/test.cc': [
        {
          side: Side.RIGHT,
          type: CoverageType.COVERED,
          code_range: {
            start_line: 20,
            end_line: 20,
          },
        },
      ],
    };
    const fetchPromise2 = Promise.resolve(ranges2);

    const gnhStub = sinon.stub(coverageClient, 'getNormalizedHost');
    const ppfpnStub = sinon.stub(coverageClient, 'parseProjectFromPathName');
    const fcrStub = sinon.stub(coverageClient, 'fetchCoverageRanges');
    const fcpStub = sinon.stub(coverageClient, 'fetchCoveragePercentages');
    gnhStub.returns(sampleChangeInfo.host);
    ppfpnStub.returns(sampleChangeInfo.project);
    fcrStub.withArgs(changeInfo1).returns(fetchPromise1);
    fcrStub.withArgs(changeInfo2).returns(fetchPromise2);
    fcpStub.returns(Promise.resolve(sampleCoveragePercentages));

    coverageClient.prefetchCoverageRanges(
      {
        project: changeInfo1.project,
        _number: changeInfo1.changeNum,
      } as unknown as ChangeInfo,
      {
        _number: changeInfo1.patchNum,
      } as unknown as RevisionInfo
    );
    coverageClient.provideCoverageRanges(
      changeInfo2.changeNum,
      'base/test.cc',
      undefined,
      changeInfo2.patchNum
    );

    // Even though the first request finishes after the second request, it
    // shouldn't overwrite the coverage ranges promise because the user has
    // moved on to a different change/patchset.
    await fetchPromise1;
    await fetchPromise2;
    assert.deepEqual(ranges2, await coverageClient.coverageData!.rangesPromise);

    gnhStub.restore();
    ppfpnStub.restore();
    fcpStub.restore();
    fcrStub.restore();
  });

  test('show low incremental coverage warning', async () => {
    const gnhStub = sinon.stub(coverageClient, 'getNormalizedHost');
    const ppfpnStub = sinon.stub(coverageClient, 'parseProjectFromPathName');
    gnhStub.returns(sampleChangeInfo.host);
    ppfpnStub.returns(sampleChangeInfo.project);
    const testCoveragePercentages = {
      'base/test.cc': {
        absolute: 80,
        incremental: 50,
      },
    };

    coverageClient.coverageData = {
      changeInfo: sampleChangeInfo,
      percentagesPromise: new Promise((resolve, reject) => {
        resolve(testCoveragePercentages);
      }),
      rangesPromise: Promise.resolve(null),
    };

    const response = await coverageClient.mayBeShowLowCoverageWarning(
      sampleChangeInfo.changeNum,
      sampleChangeInfo.patchNum
    );
    assert.equal(response.runs!.length, 1);
    assert.equal(response.runs![0]!.results!.length, 1);
    assert.equal(response.runs![0]!.results![0]!.category, 'WARNING');

    gnhStub.restore();
    ppfpnStub.restore();
  });

  test('show percentage columns', async () => {
    const ppfpnStub = sinon
      .stub(coverageClient, 'parseProjectFromPathName')
      .returns('chromium/src');
    const configPromise = new Promise((resolve, reject) => {
      resolve({enabled: true});
    });
    const oldPlugin = coverageClient.plugin;
    const newPlugin = {
      getPluginName: sinon.stub().returns('chromium-coverage'),
      restApi: sinon.stub().returns({
        get: sinon.stub().returns(configPromise),
      }),
    };
    coverageClient.plugin = newPlugin as unknown as PluginApi;

    assert.equal(true, await coverageClient.showPercentageColumns());
    assert.equal(
      '/projects/chromium%2Fsrc/chromium-coverage~config',
      newPlugin.restApi().get.getCall(0).args[0]
    );

    ppfpnStub.restore();
    coverageClient.plugin = oldPlugin;
  });
});
