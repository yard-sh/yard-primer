// Primer's Markdown: small on purpose, and safe by construction.
//
// Section bodies are written by admins but read by everyone, so the renderer
// treats them as untrusted. The order is what makes it safe:
//
//   1. Code and math are cut out first and parked behind placeholders, so
//      nothing inside them is ever read as Markdown.
//   2. Everything left is HTML-escaped. From here on, no character from the
//      source can open a tag or an attribute.
//   3. Blocks and inline formatting are parsed from the escaped text, and
//      every URL is checked against an allowlist of schemes.
//   4. The parked pieces go back in. Each was escaped when it was parked.
//
// Supported: # headings, paragraphs, **bold**, *italic*, `code`, fenced code,
// - and 1. lists, > quotes, > [!NOTE|TIP|WARNING|EXAMPLE] callouts, | tables |,
// [links](https://...), ![images](https://...), $inline$ and $$display$$ math.
//
// renderMarkdown() is a pure function (no DOM), so node can test it. Math is
// emitted as <span class="math">TeX</span>; typeset() hands those spans to
// KaTeX, which loads from jsDelivr on first use. If it never arrives, the TeX
// source stays readable as monospace text.

// Placeholders use Unicode private-use characters, which the source is
// scrubbed of first, so a body can never forge one.
const OPEN = String.fromCharCode(0xe000);
const CLOSE = String.fromCharCode(0xe001);
const BLOCK = String.fromCharCode(0xe002); // a parked block of its own (fenced code)
const DISPLAY = String.fromCharCode(0xe003); // parked $$display math$$
const PRIVATE = "[" + OPEN + CLOSE + BLOCK + DISPLAY + "]";
const PRIVATE_RE = new RegExp(PRIVATE, "g");
const HAS_PRIVATE = new RegExp(PRIVATE);
const TOKEN_RE = new RegExp(OPEN + "(\\d+)" + CLOSE, "g");
const BLOCK_LINE = new RegExp("^" + BLOCK + OPEN + "\\d+" + CLOSE + "$");
const DISPLAY_LINE = new RegExp("^" + DISPLAY + OPEN + "\\d+" + CLOSE + "$");

const CALLOUTS = { NOTE: "Note", TIP: "Tip", WARNING: "Watch out", EXAMPLE: "Example" };

export function renderMarkdown(source) {
  const tokens = [];
  const park = (html) => OPEN + (tokens.push(html) - 1) + CLOSE;

  let src = String(source || "")
    .replace(/\r\n?/g, "\n")
    .replace(PRIVATE_RE, "");

  // Fenced code. Its placeholder sits on a line of its own behind the BLOCK
  // marker, which the block parser passes through unwrapped.
  src = src.replace(/^```[ \t]*([^\n`]*)\n(?:([\s\S]*?)\n)?```[ \t]*$/gm, (_, info, code) => {
    const lang = (info.trim().split(/\s+/)[0] || "").toLowerCase();
    const label = /^[a-z0-9+#-]{1,20}$/.test(lang) ? lang : "";
    const pre = `<pre class="code"${label ? ` data-lang="${label}"` : ""}><code>${escapeHTML(code || "")}</code></pre>`;
    return BLOCK + park(pre);
  });

  src = src.replace(/`([^`\n]+)`/g, (_, code) => park(`<code>${escapeHTML(code)}</code>`));

  // \$ is a literal dollar sign, never the start of math.
  src = src.replace(/\\\$/g, () => park("$"));

  src = src.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => DISPLAY + park(mathSpan(tex.trim(), true)));

  // Inline math must hug its content: "$x$" is math, "costs $5 and $10" is
  // not (the closing $ may not follow a space or come before a digit).
  src = src.replace(/\$(?=\S)([^$\n]*?\S)\$(?!\d)/g, (_, tex) => park(mathSpan(tex, false)));

  const html = blocks(escapeHTML(src).split("\n"), park);
  return restore(html, tokens).replace(PRIVATE_RE, "");
}

function mathSpan(tex, display) {
  const attrs = display ? ' class="math math--display" data-display="true"' : ' class="math"';
  return `<span${attrs}>${escapeHTML(tex)}</span>`;
}

function restore(html, tokens) {
  // Parked math can contain a parked code span, so repeat until nothing is
  // left. Each pass only ever inserts already-escaped HTML.
  for (let i = 0; i < 4 && html.includes(OPEN); i++) {
    html = html.replace(TOKEN_RE, (_, n) => tokens[Number(n)] ?? "");
  }
  return html;
}

/* ---------------------------------------------------------------- blocks */

const LIST_ITEM = /^\s*([-*+]|\d{1,3}[.)])\s+(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function blocks(lines, park) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (BLOCK_LINE.test(line.trim())) {
      out.push(line.trim().slice(BLOCK.length));
      i++;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      // The section title is the page's h1, so # and ## both become h2.
      const level = Math.max(2, heading[1].length);
      out.push(`<h${level}>${inline(heading[2], park)}</h${level}>`);
      i++;
      continue;
    }

    if (/^&gt;/.test(line)) {
      const quoted = [];
      while (i < lines.length && /^&gt;/.test(lines[i])) {
        quoted.push(lines[i].replace(/^&gt;\s?/, ""));
        i++;
      }
      out.push(quote(quoted, park));
      continue;
    }

    if (isTable(lines, i)) {
      const rows = [line];
      const divider = lines[i + 1];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++]);
      out.push(table(rows, divider, park));
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const ordered = /\d/.test(item[1]);
      const items = [];
      while (i < lines.length) {
        const match = LIST_ITEM.exec(lines[i]);
        if (match && /\d/.test(match[1]) === ordered) {
          items.push(match[2]);
          i++;
        } else if (items.length && /^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        } else {
          break;
        }
      }
      const tag = ordered ? "ol" : "ul";
      const start = ordered ? parseInt(item[1], 10) : 1;
      const attr = ordered && start !== 1 ? ` start="${start}"` : "";
      out.push(`<${tag}${attr}>${items.map((text) => `<li>${inline(text, park)}</li>`).join("")}</${tag}>`);
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && (!para.length || !startsBlock(lines, i))) {
      para.push(lines[i++].trim());
    }
    // A paragraph that is nothing but display math is a block, not a <p>.
    const joined = para.join(" ");
    if (DISPLAY_LINE.test(joined)) out.push(`<div class="math-block">${joined}</div>`);
    else out.push(`<p>${inline(joined, park)}</p>`);
  }

  return out.join("\n");
}

function isTable(lines, i) {
  return lines[i].trim().startsWith("|") && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1]);
}

function startsBlock(lines, i) {
  const line = lines[i];
  return (
    /^#{1,3}\s/.test(line) ||
    /^&gt;/.test(line) ||
    LIST_ITEM.test(line) ||
    BLOCK_LINE.test(line.trim()) ||
    isTable(lines, i)
  );
}

function quote(lines, park) {
  const first = /^\[!([A-Za-z]+)\]\s*$/.exec(lines[0] || "");
  const kind = first && first[1].toUpperCase();
  if (kind && CALLOUTS[kind]) {
    const inner = blocks(lines.slice(1), park);
    return `<aside class="callout callout--${kind.toLowerCase()}"><p class="callout__label">${CALLOUTS[kind]}</p>${inner}</aside>`;
  }
  return `<blockquote>${blocks(lines, park)}</blockquote>`;
}

function table(rows, divider, park) {
  const cells = (row) =>
    row
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  const align = cells(divider).map((spec) => {
    const left = spec.startsWith(":");
    const right = spec.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "";
  });
  const cell = (tag, text, index) => {
    const a = align[index];
    return `<${tag}${a ? ` class="align-${a}"` : ""}>${inline(text, park)}</${tag}>`;
  };
  const head = cells(rows[0]);
  const body = rows.slice(1).map(cells);
  return (
    `<div class="table-wrap"><table><thead><tr>${head.map((t, i) => cell("th", t, i)).join("")}</tr></thead>` +
    `<tbody>${body.map((r) => `<tr>${head.map((_, i) => cell("td", r[i] || "", i)).join("")}</tr>`).join("")}</tbody></table></div>`
  );
}

/* ---------------------------------------------------------------- inline */

// A URL may hold one level of balanced parentheses, for links like
// https://en.wikipedia.org/wiki/Mercury_(planet).
const URL_PART = "((?:[^()\\s]|\\([^()\\s]*\\))+)";
const IMAGE_RE = new RegExp("!\\[([^\\]]*)\\]\\(" + URL_PART + "\\)", "g");
const LINK_RE = new RegExp("\\[([^\\]]+)\\]\\(" + URL_PART + "\\)", "g");

// Finished tags are parked as they are made, so the bold and italic passes
// that follow can never reach inside an href.
function inline(text, park) {
  return text
    .replace(IMAGE_RE, (whole, alt, href) => {
      const url = safeURL(href, false);
      if (!url) return alt;
      return park(`<img src="${url}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`);
    })
    .replace(LINK_RE, (whole, label, href) => {
      const url = safeURL(href, true);
      if (!url) return label;
      const external = /^(https?:)?\/\//i.test(url);
      return park(`<a href="${url}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>`) + label + park("</a>");
    })
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?![*\w])/g, "$1<em>$2</em>")
    .replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, "$1<em>$2</em>");
}

// The URL arrives HTML-escaped. Unescape it to see what the browser would
// see, drop anything that could hide a scheme (whitespace and control
// characters), and allow only http(s), mailto (links only), fragments and
// relative paths. The result is escaped again for the attribute.
function safeURL(escaped, isLink) {
  if (HAS_PRIVATE.test(escaped)) return "";
  const raw = Array.from(unescapeHTML(escaped))
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code > 0x20 && (code < 0x7f || code > 0x9f);
    })
    .join("");
  if (!raw) return "";
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(raw);
  if (scheme) {
    const name = scheme[1].toLowerCase();
    const allowed = name === "https" || name === "http" || (isLink && name === "mailto");
    if (!allowed) return "";
  }
  return escapeHTML(raw);
}

/* ------------------------------------------------------------------ math */

// Pinned, with subresource integrity: the browser refuses a file that does
// not match these hashes byte for byte.
const KATEX = "https://cdn.jsdelivr.net/npm/katex@0.18.9/dist/";
const KATEX_JS_SRI = "sha384-19KE2cFb3U+RUWmyhBz7aLOGDG8WrRC6hE3oY/HTZZlAAVWYTdmvLC//+TIV3zUx";
const KATEX_CSS_SRI = "sha384-lPx0C4zIUZLpveABMwOFcFeGZwsvKBJfhJ85FN1PYOV7xApBcFMhcAEMVKF8loOI";
const KATEX_TIMEOUT_MS = 8000;

let katexPromise = null;

// Resolves to window.katex, or null if it could not be loaded. Remembered
// either way, so a blocked CDN costs one timeout, not one per section.
export function loadKatex() {
  if (katexPromise) return katexPromise;
  katexPromise = new Promise((resolve) => {
    if (window.katex) return resolve(window.katex);

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = KATEX + "katex.min.css";
    css.integrity = KATEX_CSS_SRI;
    css.crossOrigin = "anonymous";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = KATEX + "katex.min.js";
    script.integrity = KATEX_JS_SRI;
    script.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), KATEX_TIMEOUT_MS);
    script.onload = () => {
      clearTimeout(timer);
      resolve(window.katex || null);
    };
    script.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return katexPromise;
}

// Typeset every math span under root that has not been typeset yet. trust is
// off, so \href, \url, \includegraphics and friends render as plain text.
export async function typeset(root) {
  const spans = Array.from(root.querySelectorAll("span.math:not([data-typeset])"));
  if (!spans.length) return;
  const katex = await loadKatex();
  for (const span of spans) {
    if (!span.isConnected || span.dataset.typeset) continue;
    span.dataset.typeset = "1";
    if (!katex) {
      span.classList.add("math--source");
      continue;
    }
    const tex = span.textContent;
    try {
      katex.render(tex, span, {
        displayMode: span.dataset.display === "true",
        throwOnError: false,
        trust: false,
        strict: "ignore",
        maxExpand: 1000,
        maxSize: 50,
      });
    } catch {
      span.textContent = tex;
      span.classList.add("math--source");
    }
  }
}

/* ----------------------------------------------------------------- utils */

function escapeHTML(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function unescapeHTML(text) {
  return text.replace(
    /&(amp|lt|gt|quot|#39);/g,
    (_, name) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[name],
  );
}
