/*
Copyright 2020 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
*/

import './styles.js';

/** Base class for all components */
class BaseComponent extends Polymer.Element {
  static get properties() {
    return {
      shown: {
        type: Boolean,
        value: false,
      }
    };
  }

  _computeCoverageClass(shown) {
    if (shown) {
      return 'coverage-percentage-column';
    }

    return 'coverage-percentage-column hidden';
  }
}

class BaseCoverageComponent extends BaseComponent {
  static get properties() {
    return {
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
    };
  }

  static get observers() {
    return [
      '_computePercentage(changeNum, patchRange, path, provider)',
    ];
  }

  async _computePercentage(changeNum, patchRange, path, provider) {
    this.percentageText = '-';
    if (!changeNum || !patchRange || !path || !provider) {
      return;
    }

    const p = await provider(changeNum, path, patchRange.patchNum);
    if (p && p[this.type]) {
      this.percentageText = p[this.type] + '%';
    }
  }
}

class AbsoluteUnitTestsHeaderView extends BaseComponent {
  static get template() {
    return Polymer.html`
      <style include="coverage-column-styles"></style>
      <div class$="[[_computeCoverageClass(shown)]]" title="Absolute coverage percentage(Unit Tests) of the whole file">|Cov|(U)</div>
    `;
  }

  static get is() {
    return 'absolute-unit-tests-header-view';
  }
}
customElements.define(AbsoluteUnitTestsHeaderView.is, AbsoluteUnitTestsHeaderView);

class IncrementalUnitTestsHeaderView extends BaseComponent {
  static get template() {
    return Polymer.html`
      <style include="coverage-column-styles"></style>
      <div class$="[[_computeCoverageClass(shown)]]" title="Incremental coverage percentage(Unit Tests) of new lines in the file">ΔCov(U)</div>
    `;
  }

  static get is() {
    return 'incremental-unit-tests-header-view';
  }
}
customElements.define(IncrementalUnitTestsHeaderView.is, IncrementalUnitTestsHeaderView);

class AbsoluteHeaderView extends BaseComponent {
  static get template() {
    return Polymer.html`
      <style include="coverage-column-styles"></style>
      <div class$="[[_computeCoverageClass(shown)]]" title="Absolute coverage percentage(All Tests) of the whole file">|Cov|</div>
    `;
  }

  static get is() {
    return 'absolute-header-view';
  }
}
customElements.define(AbsoluteHeaderView.is, AbsoluteHeaderView);

class IncrementalHeaderView extends BaseComponent {
  static get template() {
    return Polymer.html`
      <style include="coverage-column-styles"></style>
      <div class$="[[_computeCoverageClass(shown)]]" title="Incremental coverage percentage(All Tests) of new lines in the file">ΔCov</div>
    `;
  }

  static get is() {
    return 'incremental-header-view';
  }
}
customElements.define(IncrementalHeaderView.is, IncrementalHeaderView);

class AbsoluteUnitTestsContentView extends BaseCoverageComponent {
  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]">[[percentageText]]</div>
     `;
  }

  static get is() {
    return 'absolute-unit-tests-content-view';
  }

  static get properties() {
    return {type: {type: String, value: 'absolute_unit_tests', readOnly: true}};
  }
}
customElements.define(AbsoluteUnitTestsContentView.is, AbsoluteUnitTestsContentView);

class IncrementalUnitTestsContentView extends BaseCoverageComponent {
  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]">[[percentageText]]</div>
     `;
  }

  static get is() {
    return 'incremental-unit-tests-content-view';
  }

  static get properties() {
    return {type: {type: String, value: 'incremental_unit_tests', readOnly: true}};
  }
}
customElements.define(IncrementalUnitTestsContentView.is, IncrementalUnitTestsContentView);

class AbsoluteContentView extends BaseCoverageComponent {
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
    return {type: {type: String, value: 'absolute', readOnly: true}};
  }
}
customElements.define(AbsoluteContentView.is, AbsoluteContentView);

class IncrementalContentView extends BaseCoverageComponent {
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
    return {type: {type: String, value: 'incremental', readOnly: true}};
  }
}
customElements.define(IncrementalContentView.is, IncrementalContentView);

class AbsoluteUnitTestsSummaryView extends BaseComponent {
  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]"></div>
    `;
  }

  static get is() {
    return 'absolute-unit-tests-summary-view';
  }
}
customElements.define(AbsoluteUnitTestsSummaryView.is, AbsoluteUnitTestsSummaryView);

class IncrementalUnitTestsSummaryView extends BaseComponent {
  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]"></div>
    `;
  }

  static get is() {
    return 'incremental-unit-tests-summary-view';
  }
}
customElements.define(IncrementalUnitTestsSummaryView.is, IncrementalUnitTestsSummaryView);

class AbsoluteSummaryView extends BaseComponent {
  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]"></div>
    `;
  }

  static get is() {
    return 'absolute-summary-view';
  }
}
customElements.define(AbsoluteSummaryView.is, AbsoluteSummaryView);

class IncrementalSummaryView extends BaseComponent {
  static get template() {
    return Polymer.html`
       <style include="coverage-column-styles"></style>
       <div class$="[[_computeCoverageClass(shown)]]"></div>
    `;
  }

  static get is() {
    return 'incremental-summary-view';
  }
}
customElements.define(IncrementalSummaryView.is, IncrementalSummaryView);

