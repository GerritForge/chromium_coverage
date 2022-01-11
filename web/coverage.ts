/** @license
 * Copyright 2020 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import {PluginApi} from '@gerritcodereview/typescript-api/plugin';
import {
  CoverageRange,
  CoverageType,
  Side,
} from '@gerritcodereview/typescript-api/diff';
import {
  Category,
  CheckResult,
  FetchResponse,
  ResponseCode,
  RunStatus,
} from '@gerritcodereview/typescript-api/checks';
import {
  ChangeInfo,
  RevisionInfo,
} from '@gerritcodereview/typescript-api/rest-api';

// Url suffix of the code coverage service API from which to fetch per-cl
// coverage data.
const COVERAGE_SERVICE_ENDPOINT_SUFFIX = '/coverage/api/coverage-data';

// The gob coverage host which is used to process internal project.
const GOB_COVERAGE_HOST = 'https://gob-coverage.googleplex.com';

// The chromium coverage host which is used to process external project.
const CHROMIUM_COVERAGE_HOST = 'https://findit-for-me.appspot.com';

// Dict of gerrit review host and corresponding code coverage service host
// from which to fetch per-cl coverage data.
const GERRIT_TO_COVERAGE_HOST: {[host: string]: string} = {
  'chromium-review.googlesource.com': CHROMIUM_COVERAGE_HOST,
  'libassistant-internal-review.git.corp.google.com': GOB_COVERAGE_HOST,
  'libassistant-internal-review.googlesource.com': GOB_COVERAGE_HOST,
};

// Used to identify host prefixes that should be stripped. This is needed
// so that the plugin can work in different environments, such as 'canary-'.
const HOST_PREFIXES = ['canary-', 'polymer1-', 'polymer2-'];

// Bar for low coverage warning,
const LOW_COVERAGE_WARNING_BAR = 70;

declare interface CoverageConfig {
  project: string; // Used to validate/invalidate the cache.
  // Used to indicate an async fetch of per-project configuration
  configPromise: Promise<{enabled: boolean}> | null;
}

declare interface CoverageChangeInfo {
  host: string;
  project: string;
  changeNum: number;
  patchNum: number | undefined;
}
/**
 * Description of Code coverage for a file.
 *
 * @param absolute Coverage percentage of all lines.
 * @param incremental Coverage percentages of added lines.
 * @param absolute_unit_tests Coverage percentage of all lines of unittests.
 * @param incremental_unit_tests  Coverage percentages of added unitetest lines.
 */
export declare interface PercentageData {
  absolute?: number;
  incremental?: number;
  absolute_unit_tests?: number;
  incremental_unit_tests?: number;
}

declare interface CoverageData {
  changeInfo: CoverageChangeInfo;
  rangesPromise: Promise<{[path: string]: CoverageRange[]} | null>;
  percentagesPromise: Promise<{[path: string]: PercentageData} | null>;
}

declare interface LinesCoverage {
  line: number;
  count: number;
}

declare interface PctCoverage {
  covered: number;
  total: number;
}

declare interface CoverageFilesResponse {
  path: string;
  lines?: LinesCoverage[];
  absolute_coverage?: PctCoverage;
  incremental_coverage?: PctCoverage;
  absolute_unit_tests_coverage?: PctCoverage;
  incremental_unit_tests_coverage?: PctCoverage;
}

/**
 * JSON data of coverage.
 *
 * @param data Coverage, keyed by file
 */
export declare interface CoverageResponse {
  data: {files: CoverageFilesResponse[]};
}

/**
 * Provides APIs to fetch and cache coverage data.
 */
export class CoverageClient {
  plugin: PluginApi;

  coverageConfig: CoverageConfig | null;

  coverageData: CoverageData | null;

  constructor(plugin: PluginApi) {
    this.provideCoverageRanges = this.provideCoverageRanges.bind(this);
    this.prefetchCoverageRanges = this.prefetchCoverageRanges.bind(this);
    this.provideCoveragePercentages =
      this.provideCoveragePercentages.bind(this);

    this.plugin = plugin;

    this.coverageConfig = null;
    this.coverageData = null;
  }

  /**
   * Gets the normalized host name.
   *
   * @param host The host name of the window location.
   */
  getNormalizedHost(host: string): string {
    for (const prefix of HOST_PREFIXES) {
      if (host.startsWith(prefix)) {
        host = host.substring(prefix.length);
        break;
      }
    }

    return host;
  }

  /**
   * Parses project name from the path name.
   *
   * The path name is expected to be in one of the following forms:
   * '/c/chromium/src/+/1369646'
   * '/c/chromium/src/+/1369646/3'
   * '/c/chromium/src/+/1369646/3/base/base/test.cc'
   *
   * @param pathName The path name of the window location.
   * @return Returns current project such as chromium/src if the url
   *     is valid, otherwise, returns null.
   */
  parseProjectFromPathName(pathName: string): string {
    if (!pathName.startsWith('/c/')) {
      throw new Error(`${pathName} is expected to start with "/c/"`);
    }

    const indexEnd = pathName.indexOf('/+');
    if (indexEnd === -1) {
      throw new Error(`${pathName} is expected to contain "/+"`);
    }

    return pathName.substring(3, indexEnd);
  }

  /**
   * Fetches code coverage data from coverage service for a patchset.
   * The value of 'incremental_coverage' is null if there are no added lines.
   */
  async fetchCoverageJsonData(
    changeInfo: CoverageChangeInfo,
    kind: string
  ): Promise<CoverageResponse> {
    if (kind !== 'lines' && kind !== 'percentages') {
      throw new Error('Kind is expected to be either "lines" or "percentages"');
    }
    if (changeInfo.patchNum === undefined) {
      throw new Error('Patch number is undefined, cannot get coverage data');
    }
    const params = new URLSearchParams({
      host: changeInfo.host,
      project: changeInfo.project,
      change: changeInfo.changeNum.toString(),
      patchset: changeInfo.patchNum.toString(),
      type: kind,
      format: 'json',
      concise: '1',
    });

    let coverageHost = GERRIT_TO_COVERAGE_HOST[changeInfo.host];
    // If the host is not found, use CHROMIUM_COVERAGE_HOST by default.
    if (!coverageHost) {
      coverageHost = CHROMIUM_COVERAGE_HOST;
    }
    const endpoint = coverageHost + COVERAGE_SERVICE_ENDPOINT_SUFFIX;
    const url = `${endpoint}?${params.toString()}`;
    const response = await fetch(url);
    const responseJson = await response.json();
    if (
      response.status === 400 &&
      responseJson.is_project_supported === false
    ) {
      throw new Error(
        `"${changeInfo.project}" project is not supported for code coverage`
      );
    }

    if (response.status === 500 && responseJson.is_service_enabled === false) {
      throw new Error('Code coverage service is temporarily disabled');
    }

    if (!response.ok) {
      throw new Error(
        `Request code coverage data returned http ${response.status}`
      );
    }

    return responseJson;
  }

  /**
   * Converts the JSON response to coverage ranges needed by coverage layer.
   *
   * @param responseJson The JSON response returned from coverage
   *     service.
   * @return Returns an object whose properties are file paths and
   *     corresponding values are a list of coverage ranges if the JSON
   *     response has valid format, otherwise, returns null.
   */
  convertResponseJsonToCoverageRanges(responseJson: CoverageResponse): {
    [path: string]: CoverageRange[];
  } {
    if (!responseJson.data) {
      throw new Error(
        'Invalid coverage lines response format. Expecting "data" property'
      );
    }

    const responseData = responseJson.data;
    if (!responseData.files) {
      throw new Error(
        'Invalid coverage lines response format. Expecting "files" property'
      );
    }

    const responseFiles = responseData.files;
    const coverageRanges: {[path: string]: CoverageRange[]} = {};

    for (let i = 0; i < responseFiles.length; i++) {
      const responseFile = responseFiles[i];
      if (!responseFile.path || !responseFile.lines) {
        throw new Error(
          'Invalid coverage lines response format. Expecting ' +
            '"path" and "lines" properties'
        );
      }

      coverageRanges[responseFile.path] = [];
      const responseLines = responseFile.lines;
      responseLines.sort((a, b) => (a.line > b.line ? 1 : -1));
      let startLine = -1;
      let endLine = -1;
      let isCovered = null;
      for (let j = 0; j < responseLines.length; j++) {
        const responseLine = responseLines[j];
        if (!responseLine.line || responseLine.count === null) {
          throw new Error(
            'Invalid coverage lines response format. ' +
              'Expecting "line" and "count" properties'
          );
        }

        if (
          startLine !== -1 &&
          responseLine.line === endLine + 1 &&
          isCovered === responseLine.count > 0
        ) {
          endLine += 1;
          continue;
        }

        if (startLine !== -1) {
          coverageRanges[responseFile.path].push({
            side: Side.RIGHT,
            type: isCovered ? CoverageType.COVERED : CoverageType.NOT_COVERED,
            code_range: {
              start_line: startLine,
              end_line: endLine,
            },
          });
        }

        startLine = responseLine.line;
        endLine = startLine;
        isCovered = responseLine.count > 0;
      }

      if (startLine !== -1) {
        coverageRanges[responseFile.path].push({
          side: Side.RIGHT,
          type: isCovered ? CoverageType.COVERED : CoverageType.NOT_COVERED,
          code_range: {
            start_line: startLine,
            end_line: endLine,
          },
        });
      }
    }

    return coverageRanges;
  }

  /**
   * Fetches code coverage ranges from coverage service for a patchset.
   *
   * @param changeInfo Has host, project, changeNum and patchNum.
   * @return Resolves to a map of files to coverage ranges if the
   *     coverage ata is successfully retrieved and parsed, otherwise,
   *     resolves to null.
   */
  async fetchCoverageRanges(
    changeInfo: CoverageChangeInfo
  ): Promise<{[path: string]: CoverageRange[]}> {
    const responseJson = await this.fetchCoverageJsonData(changeInfo, 'lines');
    return this.convertResponseJsonToCoverageRanges(responseJson);
  }

  /**
   * Converts the JSON response to coverage percentages.
   *
   * @param responseJson The JSON response returned from coverage
   *     service.
   * @return Returns an object whose properties are file paths and
   *     corresponding values are objects representing absolute and
   *     incremental coverage percentages if the JSON response has valid
   *     format, otherwise, returns null.
   */
  convertResponseJsonToCoveragePercentages(responseJson: CoverageResponse): {
    [path: string]: PercentageData;
  } {
    if (!responseJson.data) {
      throw new Error(
        'Invalid coverage percentages response format. ' +
          'Expecting "data" property'
      );
    }

    const responseData = responseJson.data;
    if (!responseData.files) {
      throw new Error(
        'Invalid coverage percentages response format. ' +
          'Expecting "files" property'
      );
    }

    const coveragePercentages: {[path: string]: PercentageData} = {};
    for (const responseFile of responseData.files) {
      if (!responseFile.path || !responseFile.absolute_coverage) {
        throw new Error(
          'Invalid coverage percentages response format. ' +
            'Expecting "path" and "absolute_coverage" ' +
            'properties'
        );
      }

      const fileCov: PercentageData = {};

      if (responseFile.absolute_coverage) {
        fileCov.absolute = Math.round(
          (responseFile.absolute_coverage.covered * 100) /
            responseFile.absolute_coverage.total
        );
      }
      if (responseFile.incremental_coverage) {
        fileCov.incremental = Math.round(
          (responseFile.incremental_coverage.covered * 100) /
            responseFile.incremental_coverage.total
        );
      }
      if (responseFile.absolute_unit_tests_coverage) {
        fileCov.absolute_unit_tests = Math.round(
          (responseFile.absolute_unit_tests_coverage.covered * 100) /
            responseFile.absolute_unit_tests_coverage.total
        );
      }
      if (responseFile.incremental_unit_tests_coverage) {
        fileCov.incremental_unit_tests = Math.round(
          (responseFile.incremental_unit_tests_coverage.covered * 100) /
            responseFile.incremental_unit_tests_coverage.total
        );
      }

      coveragePercentages[responseFile.path] = fileCov;
    }

    return coveragePercentages;
  }

  /**
   * Fetches code coverage percentages from coverage service for a patchset.
   *
   * @param changeInfo Has host, project, changeNum and patchNum.
   * @return Resolves to a map of files to coverage percentages if
   *     coverage data is successfully retrieved and parsed, otherwise,
   *     resolves to null.
   */
  async fetchCoveragePercentages(
    changeInfo: CoverageChangeInfo
  ): Promise<{[path: string]: PercentageData}> {
    const responseJson = await this.fetchCoverageJsonData(
      changeInfo,
      'percentages'
    );
    return this.convertResponseJsonToCoveragePercentages(responseJson);
  }

  /**
   * Fetches code coverage ranges from coverage service for a patchset.
   *
   * @param changeInfo Has host, project, changeNum and patchNum.
   */
  updateCoverageDataIfNecessary(changeInfo: CoverageChangeInfo) {
    if (
      changeInfo.patchNum === undefined ||
      isNaN(changeInfo.changeNum) ||
      isNaN(changeInfo.patchNum) ||
      changeInfo.changeNum <= 0 ||
      changeInfo.patchNum <= 0
    ) {
      return;
    }

    if (
      !this.coverageData ||
      JSON.stringify(changeInfo) !==
        JSON.stringify(this.coverageData.changeInfo)
    ) {
      this.coverageData = {
        changeInfo,
        rangesPromise: this.fetchCoverageRanges(changeInfo),
        percentagesPromise: this.fetchCoveragePercentages(changeInfo),
      };
      this.coverageData.rangesPromise.catch(error => {
        console.warn(error);
      });
      this.coverageData.percentagesPromise.catch(error => {
        console.warn(error);
      });
    }
  }

  /**
   * Provides code coverage ranges for a file of a patchset.
   *
   * @param changeNum The change number of the patchset.
   * @param path The relative path to the file.
   * @param basePatchNum The patchset number of the base patchset.
   * @param patchNum The patchset number of the patchset.
   * @return Returns a list of coverage ranges. On error, it logs the
   *     error and returns null/undefined.
   */
  async provideCoverageRanges(
    changeNum: number,
    path: string,
    basePatchNum: number | undefined,
    patchNum: number | undefined
  ): Promise<CoverageRange[] | undefined> {
    const changeInfo: CoverageChangeInfo = {
      host: this.getNormalizedHost(window.location.host),
      project: this.parseProjectFromPathName(window.location.pathname),
      changeNum,
      patchNum,
    };
    this.updateCoverageDataIfNecessary(changeInfo);
    try {
      if (this.coverageData) {
        const coverageRanges = await this.coverageData.rangesPromise;
        if (coverageRanges) {
          return coverageRanges[path] || [];
        }
        return [];
      } else {
        return undefined;
      }
    } catch (error: unknown) {
      console.info(error);
      return undefined;
    }
  }

  /**
   * Prefetch coverage ranges.
   *
   * This method is supposed to be triggered by the 'showchange' event.
   *
   * @param change Info of the current change.
   * @param revision Info of the current revision.
   */
  prefetchCoverageRanges(change: ChangeInfo, revision: RevisionInfo) {
    let patchNum = NaN;
    if (typeof revision._number === 'number') {
      patchNum = revision._number;
    }
    const changeInfo: CoverageChangeInfo = {
      host: this.getNormalizedHost(window.location.host),
      project: change.project,
      changeNum: change._number,
      patchNum,
    };
    this.updateCoverageDataIfNecessary(changeInfo);
  }

  /**
   * Provides code coverage percentage for a file of a patchset.
   *
   * @param changeNum The change number of the patchset.
   * @param path The relative path to the file.
   * @param patchNum The patchset number of the patchset.
   * @param type Type of percentage: "absolute" or "incremental".
   * @return Returns an object representing the absolute and
   *     incremental coverages. On error, it logs the error and returns
   *     null/undefined.
   */
  async provideCoveragePercentages(
    changeNum: string,
    path: string,
    patchNum: string
  ): Promise<PercentageData | null> {
    const changeInfo: CoverageChangeInfo = {
      host: this.getNormalizedHost(window.location.host),
      project: this.parseProjectFromPathName(window.location.pathname),
      changeNum: Number(changeNum),
      patchNum: Number(patchNum),
    };
    this.updateCoverageDataIfNecessary(changeInfo);
    try {
      if (this.coverageData) {
        const coveragePercentages = await this.coverageData.percentagesPromise;
        if (coveragePercentages) {
          return coveragePercentages[path];
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch (error: unknown) {
      console.info(error);
      return null;
    }
  }

  /**
   * Surfaces a warning if there are files with low coverage in the patchset.
   *
   * @param changeNum The change number of the patchset.
   * @param patchNum The patchset number of the patchset.
   * @return Returns an object representing the warnings.
   *  On error, it logs the error and returns null/undefined.
   */
  async mayBeShowLowCoverageWarning(
    changeNum: number,
    patchNum: number
  ): Promise<FetchResponse> {
    const changeInfo: CoverageChangeInfo = {
      host: this.getNormalizedHost(window.location.host),
      project: this.parseProjectFromPathName(window.location.pathname),
      changeNum,
      patchNum,
    };
    this.updateCoverageDataIfNecessary(changeInfo);
    try {
      if (!this.coverageData) {
        return {
          // This should never happen
          responseCode: ResponseCode.OK,
          runs: [],
        };
      }
      const coveragePercentages =
        (await this.coverageData.percentagesPromise) || {};
      const warnings: CheckResult[] = [];
      for (const file of Object.keys(coveragePercentages)) {
        const incremental = coveragePercentages[file].incremental;
        if (incremental && incremental < LOW_COVERAGE_WARNING_BAR) {
          const msg = '';
          warnings.push({
            category: Category.WARNING,
            summary: `Incremental coverage < ${LOW_COVERAGE_WARNING_BAR}%`,
            message: msg.concat(
              `Incremental coverage for ${file} is ${incremental} `,
              `which is < the bar(${LOW_COVERAGE_WARNING_BAR}%). `,
              'Please add tests for uncovered lines.'
            ),
          });
        }
      }
      return {
        responseCode: ResponseCode.OK,
        runs: [
          {
            checkName: 'Low Coverage Check',
            status: RunStatus.COMPLETED,
            results: warnings,
          },
        ],
      };
    } catch (error: unknown) {
      console.info(error);
      return {
        // TODO: Make sure that a repo not being supported is not treated as an
        // error. And then report realy errors as ERROR.
        responseCode: ResponseCode.OK,
        runs: [],
      };
    }
  }

  /**
   * Returns whether to show percentage columns for the current change.
   *
   * @return Resolves to true if to show the percentage
   *     columns, otherwise, false.
   */
  async showPercentageColumns(): Promise<boolean> {
    // This method is expected to be called when percentage columns are
    // attached, which means that the current page is at change view and that
    // the current project can be parsed from the current URL.
    const project = this.parseProjectFromPathName(window.location.pathname);
    if (!this.coverageConfig || project !== this.coverageConfig.project) {
      this.coverageConfig = {
        project,
        configPromise: this.plugin
          .restApi()
          .get(
            `/projects/${encodeURIComponent(project)}/` +
              `${encodeURIComponent(this.plugin.getPluginName())}~config`
          ),
      };
    }
    try {
      const config = await this.coverageConfig.configPromise;
      return config !== null && config.enabled;
    } catch (error: unknown) {
      console.info(error);
      return false;
    }
  }
}
