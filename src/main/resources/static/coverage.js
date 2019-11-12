// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function() {
  'use strict';

  // Url suffix of the code coverage service API from which to fetch per-cl
  // coverage data.
  const COVERAGE_SERVICE_ENDPOINT_SUFFIX = '/coverage/api/coverage-data';

  // The gob coverage host which is used to process internal project.
  const GOB_COVERAGE_HOST = 'https://gob-coverage.googleplex.com';

  // The chromium coverage host which is used to process external project.
  const CHROMIUM_COVERAGE_HOST = 'https://findit-for-me.appspot.com';

  // Dict of gerrit review host and corresponding code coverage service host
  // from which to fetch per-cl coverage data.
  const COVERAGE_SERVICE_HOST = {
    'chromium-review.googlesource.com': CHROMIUM_COVERAGE_HOST,
    'libassistant-internal-review.git.corp.google.com': GOB_COVERAGE_HOST,
    'libassistant-internal-review.googlesource.com': GOB_COVERAGE_HOST,
  };

  // Used to identify host prefixes that should be stripped. This is needed
  // so that the plugin can work in different environments, such as 'canary-'.
  const HOST_PREFIXES = ['canary-', 'polymer1-', 'polymer2-'];

  /**
   * Provides APIs to fetch and cache coverage data.
   */
  class CoverageClient {

    constructor(plugin) {
      this.provideCoverageRanges = this.provideCoverageRanges.bind(this);
      this.prefetchCoverageRanges = this.prefetchCoverageRanges.bind(this);
      this.provideCoveragePercentages =
          this.provideCoveragePercentages.bind(this);

      this.plugin = plugin;

      // Used to cache coverage config for a project.
      this.coverageConfig = {
        // Used to validate/invalidate the cache.
        project: null,

        // Used to indicate an async fetch of per-project configuration, and it
        // is exepcted to be resolved to an object defined by:
        // https://chromium.googlesource.com/infra/gerrit-plugins/code-coverage/+/refs/heads/master/src/main/java/com/googlesource/chromium/plugins/coverage/GetConfig.java#34
        configPromise: null,
      }

      // Used to cache coverage date for a patchset.
      this.coverageData = {
        // Used to validate/invalidate the cache.
        changeInfo: {
          host: null,
          project: null,
          changeNum: null,
          patchNum: null,
        },

        // Used to indicate that an async fetch of coverage ranges, and it is
        // expeccted to be resolved to an object with following format:
        // An object whose properties are file paths and corresponding values
        // are arrays of coverage ranges with the following format:
        // {
        //   side: 'right',
        //   type: 'COVERED',
        //   code_range: {
        //     start_line: 1,
        //     end_line: 3,
        //   },
        // };
        rangesPromise: null,

        // Used to indicate an async fetch of coverage percentages, and it is
        // expected to be resolved to an object with following format:
        // An object whose properties are file paths and corresponding values
        // are also objects that look like:
        // {
        //   absolute: 99, // Coverage percentage of all lines.
        //   incremental: 75, // Coverage percentages of added lines.
        // };
        percentagesPromise: null,
      };
    }

    /**
     * Gets the normalized host name.
     * @param {string} host The host name of the window location.
     */
    getNormalizedHost(host) {
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
     * @param {string} pathName The path name of the window location.
     * @return {string} Returns current project such as chromium/src if the url
     *     is valid, otherwise, returns null.
     */
    parseProjectFromPathName(pathName) {
      if (!pathName.startsWith('/c/')) {
        throw new Error(`${pathName} is expected to start with "/c/"`);
      }

      const indexEnd = pathName.indexOf('/+');
      if (indexEnd == -1) {
        throw new Error(`${pathName} is expected to contain "/+"`)
      }

      return pathName.substring(3, indexEnd);
    }

    /**
     * Fetches code coverage data from coverage service for a patchset.
     *
     * There are two types of data can be fetched: 'lines' or 'percentages'.
     * The response of 'lines' fetch looks like:
     *
     * {
     *   data: {
     *     files: [
     *       {
     *         path: 'base/task/task_scheduler/priority_queue_unittest.cc',
     *         lines: [
     *           {
     *             line: 168,
     *             count: 10
     *           },
     *         ]
     *       }
     *     ]
     *   }
     * }
     *
     * The response of 'percentages' fetch looks like:
     * {
     *   data: {
     *     files: [
     *       {
     *         path: 'base/files/file_util_unittest.cc',
     *         absolute_coverage: {
     *           covered: 2729,
     *           total: 2744,
     *         },
     *         incremental_coverage: {
     *           covered: 9,
     *           total: 12,
     *         },
     *       }
     *     ]
     *   }
     * }
     * The value of 'incremental_coverage' is null if there are no added lines.
     *
     * @param {object} changeInfo Has host, project, changeNum and patchNum.
     * @param {string} type Type of data to fetch: "lines" or "percentages".
     * @return {promise} Resolves to parsed JSON response body if the coverage
     *     data is successfully retrieved, otherwise, resolves to null.
     */
    async fetchCoverageJsonData(changeInfo, type) {
      if (type !== 'lines' && type !== 'percentages') {
        throw new Error(
            'Type is expected to be either "lines" or "percentages"');
      }

      const params = new URLSearchParams({
        host: changeInfo.host,
        project: changeInfo.project,
        change: changeInfo.changeNum,
        patchset: changeInfo.patchNum,
        type: type,
        format: 'json',
        concise: '1',
      });

      let coverageHost = COVERAGE_SERVICE_HOST[changeInfo.host];
      // If the host is not found, use CHROMIUM_COVERAGE_HOST by default.
      if (coverageHost === undefined) {
        coverageHost = CHROMIUM_COVERAGE_HOST;
      }
      const endpoint = coverageHost + COVERAGE_SERVICE_ENDPOINT_SUFFIX;
      const url = `${endpoint}?${params.toString()}`;
      const response = await fetch(url);
      const responseJson = await response.json();
      if (response.status == 400 &&
          responseJson.is_project_supported === false) {
        throw new Error(`"${changeInfo.project}" project is not supported ` +
                        `for code coverage`);
      }

      if (response.status == 500 &&
          responseJson.is_service_enabled === false) {
        throw new Error('Code coverage service is temporarily disabled');
      }

      if (!response.ok) {
        throw new Error(`Request code coverage data returned http ` +
                        `${response.status}`);
      }

      return responseJson;
    }

    /**
     * Converts the JSON response to coverage ranges needed by coverage layer.
     * @param {object} responseJson The JSON response returned from coverage
     *     service.
     * @return {object} Returns an object whose properties are file paths and
     *     corresponding values are a list of coverage ranges if the JSON
     *     response has valid format, otherwise, returns null.
     */
    convertResponseJsonToCoverageRanges(responseJson) {
      if (!responseJson.data) {
        throw new Error('Invalid coverage lines response format. Expecting ' +
                        '"data" property');
      }

      const responseData = responseJson.data;
      if (!responseData.files) {
        throw new Error('Invalid coverage lines response format. Expecting ' +
                        '"files" property');
      }

      const responseFiles = responseData.files;
      let coverageRanges = {};

      for (var i = 0; i < responseFiles.length; i++) {
        const responseFile = responseFiles[i];
        if (!responseFile.path || !responseFile.lines) {
          throw new Error('Invalid coverage lines response format. Expecting ' +
                          '"path" and "lines" properties');
        }

        coverageRanges[responseFile.path] = new Array();
        const responseLines = responseFile.lines;
        responseLines.sort((a, b) => (a.line > b.line)? 1 : -1);
        let startLine = -1;
        let endLine = -1;
        let isCovered = null;
        for (var j = 0; j < responseLines.length; j++) {
          const responseLine = responseLines[j];
          if (!responseLine.line || responseLine.count == null) {
            throw new Error('Invalid coverage lines response format. ' +
                            'Expecting "line" and "count" properties');
          }

          if (startLine != -1 &&
              responseLine.line == endLine + 1 &&
              isCovered == (responseLine.count > 0)) {
            endLine += 1;
            continue;
          }

          if (startLine != -1) {
            coverageRanges[responseFile.path].push({
              side: 'right',
              type: (isCovered? 'COVERED' : 'NOT_COVERED'),
              code_range: {
                start_line: startLine,
                end_line: endLine,
              }
            });
          }

          startLine = responseLine.line;
          endLine = startLine;
          isCovered = (responseLine.count > 0);
        }

        if (startLine != -1) {
          coverageRanges[responseFile.path].push({
            side: 'right',
            type: (isCovered? 'COVERED' : 'NOT_COVERED'),
            code_range: {
              start_line: startLine,
              end_line: endLine,
            }
          });
        }
      }

      return coverageRanges;
    }

    /**
     * Fetches code coverage ranges from coverage service for a patchset.
     *
     * @param {object} changeInfo Has host, project, changeNum and patchNum.
     * @return {promise} Resolves to a map of files to coverage ranges if the
     *     coverage ata is successfully retrieved and parsed, otherwise,
     *     resolves to null.
     */
    async fetchCoverageRanges(changeInfo) {
      const responseJson = await this.fetchCoverageJsonData(changeInfo,
                                                            'lines');
      return this.convertResponseJsonToCoverageRanges(responseJson);
    }

    /**
     * Converts the JSON response to coverage percentages.
     * @param {object} responseJson The JSON response returned from coverage
     *     service.
     * @return {object} Returns an object whose properties are file paths and
     *     corresponding values are objects representing absolute and
     *     incremental coverage percentages if the JSON response has valid
     *     format, otherwise, returns null.
     */
    convertResponseJsonToCoveragePercentages(responseJson) {
      if (!responseJson.data) {
        throw new Error('Invalid coverage percentages response format. ' +
                        'Expecting "data" property');
      }

      const responseData = responseJson.data;
      if (!responseData.files) {
        throw new Error('Invalid coverage percentages response format. ' +
                        'Expecting "files" property');
      }

      const coveragePercentages = {};
      for (let responseFile of responseData.files) {
        if (!responseFile.path || !responseFile.absolute_coverage) {
          throw new Error('Invalid coverage percentages response format. ' +
                          'Expecting "path" and "absolute_coverage" ' +
                          'properties');
        }

        const fileCov = {
          absolute: Math.round(responseFile.absolute_coverage.covered * 100 /
                               responseFile.absolute_coverage.total),
          incremental: null,
        };

        if (responseFile.incremental_coverage) {
          fileCov.incremental = Math.round(
              responseFile.incremental_coverage.covered * 100 /
              responseFile.incremental_coverage.total);
        }

        coveragePercentages[responseFile.path] = fileCov;
      }

      return coveragePercentages;
    }

    /**
     * Fetches code coverage percentages from coverage service for a patchset.
     *
     * @param {object} changeInfo Has host, project, changeNum and patchNum.
     * @return {promise} Resolves to a map of files to coverage percentages if
     *     coverage data is successfully retrieved and parsed, otherwise,
     *     resolves to null.
     */
    async fetchCoveragePercentages(changeInfo) {
      const responseJson = await this.fetchCoverageJsonData(changeInfo,
                                                            'percentages');
      return this.convertResponseJsonToCoveragePercentages(responseJson);
    }

    /**
     * Fetches code coverage ranges from coverage service for a patchset.
     *
     * @param {object} changeInfo Has host, project, changeNum and patchNum.
     */
    updateCoverageDataIfNecessary(changeInfo) {
      if (isNaN(changeInfo.changeNum) || isNaN(changeInfo.patchNum) ||
          changeInfo.changeNum <= 0 || changeInfo.patchNum <= 0) {
        return;
      }

      if (JSON.stringify(changeInfo) !==
          JSON.stringify(this.coverageData.changeInfo)) {
        this.coverageData.changeInfo = changeInfo;
        this.coverageData.rangesPromise = this.fetchCoverageRanges(changeInfo);
        this.coverageData.rangesPromise.catch((error) => {
          console.warn(error);
        });
        this.coverageData.percentagesPromise = this.fetchCoveragePercentages(
            changeInfo);
        this.coverageData.percentagesPromise.catch((error) => {
          console.warn(error);
        })
      }
    }

    /**
     * Provides code coverage ranges for a file of a patchset.
     * @param {string} changeNum The change number of the patchset.
     * @param {string} path The relative path to the file.
     * @param {string} basePatchNum The patchset number of the base patchset.
     * @param {string} patchNum The patchset number of the patchset.
     * @return {object} Returns a list of coverage ranges. On error, it logs the
     *     error and returns null/undefined.
     */
    async provideCoverageRanges(changeNum, path, basePatchNum, patchNum) {
      const changeInfo = {
        host: this.getNormalizedHost(window.location.host),
        project: this.parseProjectFromPathName(window.location.pathname),
        changeNum: parseInt(changeNum),
        patchNum: parseInt(patchNum),
      };
      this.updateCoverageDataIfNecessary(changeInfo);
      try {
        const coverageRanges = await this.coverageData.rangesPromise;
        return coverageRanges[path] || [];
      } catch(error) {
        console.log(error);
        return null;
      }
    }

    /**
     * Prefetch coverage ranges.
     *
     * This method is supposed to be triggered by the 'showchange' event.
     *
     * @param {ChangeInfo} change Info of the current change.
     * @param {RevisionInfo} revision Info of the current revision.
     */
    prefetchCoverageRanges(change, revision) {
      const changeInfo = {
        host: this.getNormalizedHost(window.location.host),
        project: change.project,
        changeNum: parseInt(change._number),
        patchNum: parseInt(revision._number),
      };
      this.updateCoverageDataIfNecessary(changeInfo);
    }

    /**
     * Provides code coverage percentage for a file of a patchset.
     * @param {string} changeNum The change number of the patchset.
     * @param {string} path The relative path to the file.
     * @param {string} patchNum The patchset number of the patchset.
     * @param {string} type Type of percentage: "absolute" or "incremental".
     * @return {object} Returns an object representing the absolute and
     *     incremental coverages. On error, it logs the error and returns
     *     null/undefined.
     */
    async provideCoveragePercentages(changeNum, path, patchNum) {
      const changeInfo = {
        host: this.getNormalizedHost(window.location.host),
        project: this.parseProjectFromPathName(window.location.pathname),
        changeNum: parseInt(changeNum),
        patchNum: parseInt(patchNum),
      };
      this.updateCoverageDataIfNecessary(changeInfo);
      try {
        const coveragePercentages = await this.coverageData.percentagesPromise;
        return coveragePercentages[path];
      } catch(error) {
        console.log(error);
        return null;
      }
    }

    /**
     * Returns whether to show percentage columns for the current change.
     * @return {promise<boolean>} Resolves to true if to show the percentage
     *     columns, otherwise, false.
     */
    async showPercentageColumns() {
      // This method is expected to be called when percentage columns are
      // attached, which means that the current page is at change view and that
      // the current project can be parsed from the current URL.
      const project = this.parseProjectFromPathName(window.location.pathname);
      if (project !== this.coverageConfig.project) {
        this.coverageConfig.project = project;
        this.coverageConfig.configPromise = this.plugin.restApi().get(
          `/projects/${encodeURIComponent(project)}/` +
          `${encodeURIComponent(this.plugin.getPluginName())}~config`);
      }
      try {
        const config = await this.coverageConfig.configPromise;
        return config && config.enabled;
      } catch(error) {
        console.log(error);
        return false;
      }
    }
  };

  window.CoverageClient = CoverageClient;
})();
