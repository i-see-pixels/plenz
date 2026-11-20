import type { CDPSession, Page } from "@playwright/test";

/**
 * The badge and refine panel live in closed shadow roots (so pages can't
 * restyle or script them). Playwright selectors can't enter closed roots, but
 * the DevTools protocol can, so tests reach them through CDP instead of
 * opening the roots in production.
 */
export class ShadowDom {
  private constructor(
    private readonly page: Page,
    private readonly cdp: CDPSession,
  ) {}

  static async attach(page: Page) {
    return new ShadowDom(page, await page.context().newCDPSession(page));
  }

  /** Node id of the first element matching `selector` inside `#hostId`'s shadow root. */
  private async find(hostId: string, selector: string): Promise<number | null> {
    const { root } = await this.cdp.send("DOM.getDocument", {
      depth: -1,
      pierce: true,
    });
    const { nodeId: hostNode } = await this.cdp.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: `#${hostId}`,
    });
    if (!hostNode) return null;
    const { node } = await this.cdp.send("DOM.describeNode", {
      nodeId: hostNode,
      depth: 1,
      pierce: true,
    });
    const shadowRoot = node.shadowRoots?.[0];
    if (!shadowRoot) return null;
    // describeNode returns a backend id; push it to get a usable node id.
    const { nodeIds } = await this.cdp.send(
      "DOM.pushNodesByBackendIdsToFrontend",
      {
        backendNodeIds: [shadowRoot.backendNodeId],
      },
    );
    const { nodeId } = await this.cdp.send("DOM.querySelector", {
      nodeId: nodeIds[0],
      selector,
    });
    return nodeId || null;
  }

  /**
   * Resolve a node to a JS object. The overlays rebuild while streaming, so
   * a node found a moment ago may be gone: that reads as "not there".
   */
  private async resolve(nodeId: number) {
    try {
      const { object } = await this.cdp.send("DOM.resolveNode", { nodeId });
      return object;
    } catch (error) {
      if (/No node with given id/.test((error as Error).message)) return null;
      throw error;
    }
  }

  /** Text of the element, or null if it isn't there. */
  async text(hostId: string, selector: string): Promise<string | null> {
    const nodeId = await this.find(hostId, selector);
    if (!nodeId) return null;
    const object = await this.resolve(nodeId);
    if (!object) return null;
    const { result } = await this.cdp.send("Runtime.callFunctionOn", {
      objectId: object.objectId,
      functionDeclaration: "function () { return this.textContent; }",
      returnByValue: true,
    });
    return result.value as string;
  }

  /** Whether the element is rendered (not display:none). */
  async visible(hostId: string, selector: string): Promise<boolean> {
    const nodeId = await this.find(hostId, selector);
    if (!nodeId) return false;
    const object = await this.resolve(nodeId);
    if (!object) return false;
    const { result } = await this.cdp.send("Runtime.callFunctionOn", {
      objectId: object.objectId,
      functionDeclaration: "function () { return this.checkVisibility(); }",
      returnByValue: true,
    });
    return result.value === true;
  }

  /** Move keyboard focus to the element. */
  async focus(hostId: string, selector: string) {
    const nodeId = await this.find(hostId, selector);
    if (!nodeId) throw new Error(`No ${selector} in #${hostId}`);
    await this.cdp.send("DOM.focus", { nodeId });
  }

  /** Role and accessible name, as a screen reader gets them. */
  async accessible(
    hostId: string,
    selector: string,
  ): Promise<{ role?: string; name?: string } | null> {
    const nodeId = await this.find(hostId, selector);
    if (!nodeId) return null;
    const { nodes } = await this.cdp.send("Accessibility.getPartialAXTree", {
      nodeId,
      fetchRelatives: false,
    });
    const node = nodes[0];
    return {
      role: node?.role?.value as string | undefined,
      name: node?.name?.value as string | undefined,
    };
  }

  /** Click the element's centre with the real mouse. */
  async click(hostId: string, selector: string) {
    const nodeId = await this.find(hostId, selector);
    if (!nodeId) throw new Error(`No ${selector} in #${hostId}`);
    const { model } = await this.cdp.send("DOM.getBoxModel", { nodeId });
    const [x1, y1, , , x3, y3] = model.content;
    await this.page.mouse.click((x1 + x3) / 2, (y1 + y3) / 2);
  }
}
