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
  const HOST_PREFIXES = ['canary-', 'polymer2-'];

  /**
   * Provides APIs to fetch and cache coverage data.
   */
  class CoverageClient {

    constructor() {
      this.provideCoverageData = this.provideCoverageData.bind(this);
      this.prefetchCoverageData = this.prefetchCoverageData.bind(this);

      // Used to cache coverage date for a patchset.
      this.coverageData = {
        // A map whose keys are file paths and corresponding values are
        // arrays of coverage ranges with the following format:
        // {
        //   side: 'right',
        //   type: 'COVERED',
        //   code_range: {
        //     start_line: 1,
        //     end_line: 3,
        //   },
        // };
        changeInfo: {
          host: null,
          project: null,
          changeNum: null,
          patchNum: null,
        },

        // Used to indicate that an async fetch of coverage data, and it is
        // expeccted to be resolved to an object with following format:
        // A map whose keys are file paths and corresponding values are
        // arrays of coverage ranges with the following format:
        // {
        //   side: 'right',
        //   type: 'COVERED',
        //   code_range: {
        //     start_line: 1,
        //     end_line: 3,
        //   },
        // };
        rangesPromise: null,
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
     * @return {Str} Returns current project such as chromium/src if the url
     *     is valid, otherwise, returns null.
     */
    parseProjectFromPathName(pathName) {
      if (!pathName.startsWith('/c/')) {
        return null;
      }

      const indexEnd = pathName.indexOf('/+');
      if (indexEnd == -1) {
        return null;
      }

      return pathName.substring(3, indexEnd);
    }

    /**
     * Fetches code coverage data from coverage service for a patchset.
     *
     * The format of the response fetched from the server is the same as the
     * following example, and the format is flexible enough to be extended to
     * contain additional information such as branch coverage, and how many
     * times each line is covered on different platforms.
     *
     * {
     *   "data": {
     *     "files": [
     *       {
     *         "path": "base/task/task_scheduler/priority_queue_unittest.cc",
     *         "lines": [
     *           {
     *             "line": 168,
     *             "count": 10
     *           },
     *           {
     *             "line": 170,
     *             "count": 0
     *           },
     *           {
     *             "line": 171,
     *             "count": 0
     *           }
     *         ]
     *       }
     *     ]
     *   }
     * }
     *
     * @param {Object} changeInfo Has host, project, changeNum and patchNum.
     * @return {Promise} Resolves to parsed JSON response body if the coverage
     *     data is successfully retrieved, otherwise, resolves to null.
     */
    async fetchCoverageJsonData(changeInfo) {
      const params = new URLSearchParams({
        host: changeInfo.host,
        project: changeInfo.project,
        change: changeInfo.changeNum,
        patchset: changeInfo.patchNum,
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

      if (responseJson.error) {
        console.error('Parse code coverage response body to JSON returned ' +
                      'error: ', responseJson.error);
        return null;
      }

      if (response.status == 404 &&
          responseJson.is_project_supported == false) {
        console.warn(this.coverageData.changeInfo.project,
                     ' project is not supported for code coverage.');
        return null;
      }

      if (response.status == 500 &&
          responseJson.is_service_enabled == false) {
        console.warn('Code coverage service is temporarily disabled.');
        return null;
      }

      if (!response.ok) {
        console.warn(`Request code coverage data returned http ` +
                     `${response.status}`);
        return null;
      }

      return responseJson;
    }

    /**
     * Converts the JSON response to coverage ranges needed by coverage layer.
     * @param {Object} responseJson The JSON response returned from coverage
     *     service.
     * @return {Object} Returns a map whose keys are file paths and
     *     corresponding values are a list of coverage ranges if the JSON
     *     response has valid format, otherwise, returns null.
     */
    convertResponseJsonToCoverageRanges(responseJson) {
      if (!responseJson.data) {
        console.error('Invalid code coverage response format. ' +
                      'Expecting "data" in ', responseJson);
        return null;
      }

      const responseData = responseJson.data;
      if (!responseData.files) {
        console.error('Invalid code coverage response format. ' +
                      'Expecting "files" in ', responseData);
        return null;
      }

      const responseFiles = responseData.files;
      let coverageRanges = {};

      for (var i = 0; i < responseFiles.length; i++) {
        const responseFile = responseFiles[i];
        if (!responseFile.path || !responseFile.lines) {
          console.error('Invalid code coverage response format. ' +
                        'Expecting "path" and "lines" in ', responseFile);
          return null;
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
            console.error('Invalid code coverage response format. ' +
                          'Expecting "line" and "count" in ', responseLine);
            return null;
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
     * @param {Object} changeInfo Has host, project, changeNum and patchNum.
     * @return {Promise} Resolves to a map of files to coverage ranges if the
     *     coverage ata is successfully retrieved and parsed, otherwise,
     *     resolves to null.
     */
    async fetchCoverageRanges(changeInfo) {
      const responseJson = await this.fetchCoverageJsonData(changeInfo);
      if (!responseJson) {
        console.log('Failed to fetch coverage data from service.');
        return;
      }

      const coverageRanges = this.convertResponseJsonToCoverageRanges(
          responseJson);
      if (!coverageRanges) {
        console.log('Failed to validate or parse coverage ranges.');
        return;
      }

      return coverageRanges;
    }

    /**
     * Fetches code coverage ranges from coverage service for a patchset.
     *
     * @param {Object} changeInfo Has host, project, changeNum and patchNum.
     */
    updateCoverageDataIfNecessary(changeInfo) {
      if (JSON.stringify(changeInfo) !==
          JSON.stringify(this.coverageData.changeInfo)) {
        this.coverageData.changeInfo = changeInfo;
        this.coverageData.rangesPromise = this.fetchCoverageRanges(changeInfo);
      }
    }

    /**
     * Provides code coverage data for a file of a patchset.
     * @param {string} changeNum The change number of the patchset.
     * @param {string} path The relative path to the file.
     * @param {string} basePatchNum The patchset number of the base patchset.
     * @param {string} patchNum The patchset number of the patchset.
     * @return {Object} Returns a list of coverage ranges.
     */
    async provideCoverageData(changeNum, path, basePatchNum, patchNum) {
      const changeInfo = {
        host: this.getNormalizedHost(window.location.host),
        project: this.parseProjectFromPathName(window.location.pathname),
        changeNum: changeNum,
        patchNum: patchNum,
      };
      this.updateCoverageDataIfNecessary(changeInfo);
      const coverageRanges = await this.coverageData.rangesPromise;
      return coverageRanges[path] || [];
    }

    /**
     * Prefetch coverage data.
     *
     * This method is supposed to be triggered by the 'showchange' event.
     *
     * @param {ChangeInfo} change Info of the current change.
     * @param {RevisionInfo} revision Info of the current revision.
     */
    prefetchCoverageData(change, revision) {
      const changeInfo = {
        host: this.getNormalizedHost(window.location.host),
        project: change.project,
        changeNum: change._number,
        patchNum: revision._number,
      };
      this.updateCoverageDataIfNecessary(changeInfo);
    }
  };

  window.CoverageClient = CoverageClient;
})();
