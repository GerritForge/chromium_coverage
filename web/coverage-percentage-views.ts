/** @license
 * Copyright 2020 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

import {css, html, LitElement, PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators';
import {PercentageData} from './coverage';

const COMMON_CSS = css`
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

/**
 * Base Coverage Class used for all elements that have data values.
 */
export class BaseCoverageComponent extends BaseComponent {
  @property() changeNum = '';

  @property() patchRange: PatchRange | null = null;

  @property() path = '';

  @property() provider: CoverageProvider = async (
    one: string,
    two: string,
    three: string
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

  protected getPercentageFromData(pd: PercentageData): number | undefined {
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

/**
 * Component for absolute coverage header.
 */
@customElement('absolute-header-view')
export class AbsoluteHeaderView extends BaseComponent {
  static override styles = COMMON_CSS;

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

/**
 * Component for incremental coverage header.
 */
@customElement('incremental-header-view')
export class IncrementalHeaderView extends BaseComponent {
  static override styles = COMMON_CSS;

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

/**
 * Component for absolute coverage data.
 */
@customElement('absolute-content-view')
export class AbsoluteContentView extends BaseCoverageComponent {
  static override styles = COMMON_CSS;

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

/**
 * Component for incremental coverage data.
 */
@customElement('incremental-content-view')
export class IncrementalContentView extends BaseCoverageComponent {
  static override styles = COMMON_CSS;

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

/**
 * Component for absolute summary.
 */
@customElement('absolute-summary-view')
export class AbsoluteSummaryView extends BaseComponent {
  static override styles = COMMON_CSS;

  override render() {
    return html`<div class="${this.computeCoverageClass()}"></div> `;
  }
}

/**
 * Component for incremental summary.
 */
@customElement('incremental-summary-view')
export class IncrementalSummaryView extends BaseComponent {
  static override styles = COMMON_CSS;

  override render() {
    return html`<div class="${this.computeCoverageClass()}"></div> `;
  }
}

/**
 * Component for absolute unit tests header.
 */
@customElement('absolute-unit-tests-header-view')
export class AbsoluteUnitTestsHeaderView extends BaseComponent {
  static override styles = COMMON_CSS;

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

/**
 * Component for incremental unit tests header.
 */
@customElement('incremental-unit-tests-header-view')
export class IncrementalUnitTestsHeaderView extends BaseComponent {
  static override styles = COMMON_CSS;

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

/**
 * Component for absolute unit tests data.
 */
@customElement('absolute-unit-tests-content-view')
export class AbsoluteUnitTestsContentView extends BaseCoverageComponent {
  static override styles = COMMON_CSS;

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

/**
 * Component for incremental unit tests data.
 */
@customElement('incremental-unit-tests-content-view')
export class IncrementalUnitTestsContentView extends BaseCoverageComponent {
  static override styles = COMMON_CSS;

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

/**
 * Component for absolute unit tests summary.
 */
@customElement('absolute-unit-tests-summary-view')
export class AbsoluteUnitTestsSummaryView extends BaseComponent {
  static override styles = COMMON_CSS;

  override render() {
    return html` <div class="${this.computeCoverageClass()}"></div> `;
  }
}

/**
 * Component for incremental unit tests summary.
 */
@customElement('incremental-unit-tests-summary-view')
export class IncrementalUnitTestsSummaryView extends BaseComponent {
  static override styles = COMMON_CSS;

  override render() {
    return html` <div class="${this.computeCoverageClass()}"></div> `;
  }
}
