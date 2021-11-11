/** @license
 * Copyright 2020 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import {css, html, LitElement, PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators';
import {PercentageData} from './coverage';

const common_css = css`
  .coverage-percentage-column {
    display: inline-block;
    min-width: 3.5em;
    text-align: center;
  }
  .coverage-percentage-column.hidden {
    display: none;
  }
`;

/** Base class for all components */
class BaseComponent extends LitElement {
  @property() shown = false;

  override render() {
    if (this.shown) {
      return html`coverage-percentage-column`;
    }
    return html`coverage-percentage-column hidden`;
  }

  protected computeCoverageClass(): string {
    if (this.shown) {
      return 'coverage-percentage-column';
    }
    return 'coverage-percentage-column hidden';
  }
}

declare interface PatchRange {
  patchNum: string;
}

declare interface CoverageProvider {
  (
    changeNum: string,
    path: string,
    patchNum: string
  ): Promise<PercentageData | null>;
}

export class BaseCoverageComponent extends BaseComponent {
  @property() changeNum = '';

  @property() patchRange: PatchRange | null = null;

  @property() path = '';

  @property() provider: CoverageProvider = async (
    _1: string,
    _2: string,
    _3: string
  ) => null;

  @property() percentageText = '-';

  @property() kind = '';

  override update(changedProperties: PropertyValues) {
    if (
      changedProperties.has('changeNum') ||
      changedProperties.has('patchRange') ||
      changedProperties.has('path') ||
      changedProperties.has('provider')
    ) {
      this.computePercentage(
        this.changeNum,
        this.patchRange,
        this.path,
        this.provider
      );
    }
    super.update(changedProperties);
  }

  protected getPercentageFromData(_pd: PercentageData): number | undefined {
    return undefined;
  }

  protected async computePercentage(
    changeNum: string,
    patchRange: PatchRange | null,
    path: string,
    provider: CoverageProvider
  ) {
    if (!changeNum || !patchRange || !path) {
      this.percentageText = '-';
      return;
    }

    if (provider) {
      const p = await provider(changeNum, path, patchRange.patchNum);
      if (p && this.getPercentageFromData(p)) {
        this.percentageText = this.getPercentageFromData(p)!.toString() + '%';
      } else {
        this.percentageText = '-';
      }
    }
  }
}

@customElement('absolute-header-view')
export class AbsoluteHeaderView extends BaseComponent {
  static override styles = common_css;

  override render() {
    return html`
      <div
        class="${this.computeCoverageClass()}"
        title="Absolute coverage percentage(All Tests) of the whole file"
      >
        |Cov|
      </div>
    `;
  }
}

@customElement('incremental-header-view')
export class IncrementalHeaderView extends BaseComponent {
  static override styles = common_css;

  override render() {
    return html`
      <div
        class="${this.computeCoverageClass()}"
        title="Incremental coverage percentage(All Tests) of new lines in the file"
      >
        ΔCov
      </div>
    `;
  }
}

@customElement('absolute-content-view')
export class AbsoluteContentView extends BaseCoverageComponent {
  static override styles = common_css;

  constructor() {
    super();
    this.kind = 'absolute';
  }

  override getPercentageFromData(pd: PercentageData): number | undefined {
    return pd.absolute;
  }

  override render() {
    return html`
      <div class="${this.computeCoverageClass()}">${this.percentageText}</div>
    `;
  }
}

@customElement('incremental-content-view')
export class IncrementalContentView extends BaseCoverageComponent {
  static override styles = common_css;

  constructor() {
    super();
    this.kind = 'incremental';
  }

  override getPercentageFromData(pd: PercentageData): number | undefined {
    return pd.incremental;
  }

  override render() {
    return html`
      <div class="${this.computeCoverageClass()}">${this.percentageText}</div>
    `;
  }
}

@customElement('absolute-summary-view')
export class AbsoluteSummaryView extends BaseComponent {
  static override styles = common_css;

  override render() {
    return html`<div class="${this.computeCoverageClass()}"></div> `;
  }
}

@customElement('incremental-summary-view')
export class IncrementalSummaryView extends BaseComponent {
  static override styles = common_css;

  override render() {
    return html`<div class="${this.computeCoverageClass()}"></div> `;
  }
}

@customElement('absolute-unit-tests-header-view')
export class AbsoluteUnitTestsHeaderView extends BaseComponent {
  static override styles = common_css;

  override render() {
    return html`
      <div
        class="${this.computeCoverageClass()}"
        title="Absolute coverage percentage(Unit Tests) of the whole file"
      >
        |Cov|(U)
      </div>
    `;
  }
}

@customElement('incremental-unit-tests-header-view')
export class IncrementalUnitTestsHeaderView extends BaseComponent {
  static override styles = common_css;

  override render() {
    return html`
      <div
        class="${this.computeCoverageClass()}"
        title="Incremental coverage percentage(Unit Tests) of new lines in the file"
      >
        ΔCov(U)
      </div>
    `;
  }
}

@customElement('absolute-unit-tests-content-view')
export class AbsoluteUnitTestsContentView extends BaseCoverageComponent {
  static override styles = common_css;

  constructor() {
    super();
    this.kind = 'absolute_unit_tests';
  }

  override getPercentageFromData(pd: PercentageData) {
    return pd.absolute_unit_tests;
  }

  override render() {
    return html`
      <div class="${this.computeCoverageClass()}">${this.percentageText}</div>
    `;
  }
}

@customElement('incremental-unit-tests-content-view')
export class IncrementalUnitTestsContentView extends BaseCoverageComponent {
  static override styles = common_css;

  constructor() {
    super();
    this.kind = 'incremental_unit_tests';
  }

  override getPercentageFromData(pd: PercentageData) {
    return pd.incremental_unit_tests;
  }

  override render() {
    return html`
      <div class="${this.computeCoverageClass()}">${this.percentageText}</div>
    `;
  }
}

@customElement('absolute-unit-tests-summary-view')
export class AbsoluteUnitTestsSummaryView extends BaseComponent {
  static override styles = common_css;

  override render() {
    return html` <div class="${this.computeCoverageClass()}"></div> `;
  }
}

@customElement('incremental-unit-tests-summary-view')
export class IncrementalUnitTestsSummaryView extends BaseComponent {
  static override styles = common_css;

  override render() {
    return html` <div class="${this.computeCoverageClass()}"></div> `;
  }
}
