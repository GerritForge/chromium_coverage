/*
Copyright 2020 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
*/

import './styles.js';
const _coveragePercentageTemplateObject = {
  properties: {
    shown: {
      type: Boolean,
      value: false,
    }
  },

  _computeCoverageClass(shown) {
    if (shown) {
      return 'coverage-percentage-column';
    }

    return 'coverage-percentage-column hidden';
  },
};

const _coveragePercentageContentOverrideObject = {
  properties: {
    shown: {
      type: Boolean,
      value: false,
    },
    changeNum: String,
    patchRange: Object,
    path: String,
    provider: Function,
    percentageText: String,
    type: String,
  },

  observers: [
    '_computePercentage(changeNum, patchRange, path, provider)',
  ],

  async _computePercentage(changeNum, patchRange, path, provider) {
    this.percentageText = '-';
    if (!changeNum || !patchRange || !path || !provider) {
      return;
    }

    const p = await provider(changeNum, path, patchRange.patchNum);
    if (p && p[this.type]) {
      this.percentageText = p[this.type] + '%';
    }
  },
};

class AbsoluteHeaderView extends Polymer.Element {

  static get template() {
    return Polymer.html`
      <style include="coverage-column-styles"></style>
      <div class$="[[_computeCoverageClass(shown)]]" title="Absolute coverage percentage of the whole file">|Cov.|</div>
    `;
  }

  static get is() {
    return 'absolute-header-view';
  }

  static get properties() {
    return Object.assign({}, _coveragePercentageTemplateObject.properties);
  }

  _computeCoverageClass(shown) {
    return _coveragePercentageTemplateObject._computeCoverageClass.bind(this)(
        shown);
  }
}
customElements.define(AbsoluteHeaderView.is, AbsoluteHeaderView);

class IncrementalHeaderView extends Polymer.Element {

  static get template() {
    return Polymer.html`
      <style include="coverage-column-styles"></style>
      <div class$="[[_computeCoverageClass(shown)]]" title="Incremental coverage percentage of new lines in the file">ΔCov.</div>
    `;
  }

  static get is() {
    return 'incremental-header-view';
  }

  static get properties() {
    return Object.assign({}, _coveragePercentageTemplateObject.properties);
  }

  _computeCoverageClass(shown) {
    return _coveragePercentageTemplateObject._computeCoverageClass.bind(this)(
        shown);
  }
}
customElements.define(IncrementalHeaderView.is, IncrementalHeaderView);

class AbsoluteContentView extends Polymer.Element {

  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]">[[percentageText]]</div>
     `;
  }

  static get is() {
    return 'absolute-content-view';
  }

  static get properties() {
    const properties_ = Object.assign({}, _coveragePercentageContentOverrideObject.properties);
    properties_.type = { type: String, value: 'absolute', readOnly: true };
    return properties_;
  }

  static get observers(){
    return _coveragePercentageContentOverrideObject.observers;
  }

  _computeCoverageClass(shown) {
    return _coveragePercentageTemplateObject._computeCoverageClass.bind(this)(
        shown);
  }

  _computePercentage(changeNum, patchRange, path, provider) {
    return _coveragePercentageContentOverrideObject._computePercentage.bind(this)(
	changeNum, patchRange, path, provider);
  }
}
customElements.define(AbsoluteContentView.is, AbsoluteContentView);

class IncrementalContentView extends Polymer.Element {

  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]">[[percentageText]]</div>
     `;
  }

  static get is() {
    return 'incremental-content-view';
  }

  static get properties() {
    const properties_ = Object.assign({}, _coveragePercentageContentOverrideObject.properties);
    properties_.type = { type: String, value: 'incremental', readOnly: true };
    return properties_;
  }

  static get observers(){
    return _coveragePercentageContentOverrideObject.observers;
  }

  _computeCoverageClass(shown) {
    return _coveragePercentageTemplateObject._computeCoverageClass.bind(this)(
        shown);
  }

  _computePercentage(changeNum, patchRange, path, provider) {
    return _coveragePercentageContentOverrideObject._computePercentage.bind(this)(
	changeNum, patchRange, path, provider);
  }
}
customElements.define(IncrementalContentView.is, IncrementalContentView);

class AbsoluteSummaryView extends Polymer.Element {

  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]"></div>
    `;
  }

  static get is() {
    return 'absolute-summary-view';
  }

  static get properties() {
    return Object.assign({}, _coveragePercentageTemplateObject.properties);
  }

  _computeCoverageClass(shown) {
    return _coveragePercentageTemplateObject._computeCoverageClass.bind(this)(
        shown);
  }
}
customElements.define(AbsoluteSummaryView.is, AbsoluteSummaryView);


class IncrementalSummaryView extends Polymer.Element {

  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]"></div>
    `;
  }

  static get is() {
    return 'incremental-summary-view';
  }

  static get properties() {
    return Object.assign({}, _coveragePercentageTemplateObject.properties);
  }

  _computeCoverageClass(shown) {
    return _coveragePercentageTemplateObject._computeCoverageClass.bind(this)(
        shown);
  }
}
customElements.define(IncrementalSummaryView.is, IncrementalSummaryView);
