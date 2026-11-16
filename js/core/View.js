import { h } from './dom.js';

/** Base class for every screen. Subclasses implement build() and call refresh() after state changes. */
export class View {
  constructor(api) { this.api = api; this.host = h('section'); }
  async build() { throw new Error('build() not implemented'); }
  async refresh() { this.host.replaceChildren(...(await this.build())); }
  async mount(container) { container.replaceChildren(this.host); await this.refresh(); }
}
