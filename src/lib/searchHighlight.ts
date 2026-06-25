// Generic in-page text search: finds the first visible element containing the
// query text, scrolls it into view, and applies a temporary red outline.
export function searchAndHighlight(rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return false;

  const root = document.body;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue;
      if (!text || !text.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
      // skip inside the search input itself / search panels
      if (parent.closest("input,textarea,[data-search-panel]")) return NodeFilter.FILTER_REJECT;
      return text.toLowerCase().includes(query) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const node = walker.nextNode();
  if (!node) return false;

  // Find a nice container: nearest card-like ancestor, else parent element.
  let target: HTMLElement | null = node.parentElement;
  if (target) {
    const card = target.closest<HTMLElement>(
      "[data-search-target], .rounded-\\[24px\\], .rounded-\\[20px\\], .rounded-2xl, .rounded-xl, section, article, .card"
    );
    if (card) target = card;
  }
  if (!target) return false;

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("search-flash-highlight");
  window.setTimeout(() => {
    target?.classList.remove("search-flash-highlight");
  }, 3600);
  return true;
}
