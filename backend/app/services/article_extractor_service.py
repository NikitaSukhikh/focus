"""
Article extractor service for robust web-article rendering.

Why this exists:
- Many sources block iframe/webview embedding with frame policies.
- A readable extraction fallback keeps rendering consistent across domains.
- Wikipedia is handled through MediaWiki REST output for higher extraction quality.
"""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any
from urllib.parse import quote, unquote, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

from app.core.logging import get_logger


logger = get_logger(__name__)


@dataclass(slots=True)
class ArticleExtractionResult:
    """Normalized article extraction output consumed by preview routes."""

    title: str | None
    content_html: str
    content_text: str
    source_url: str
    render_mode: str = "article"
    attribution: str | None = None
    license: str | None = None


class ArticleExtractionError(Exception):
    """Raised when readable article extraction cannot be completed."""


class ArticleExtractorService:
    """
    Extracts readable article HTML from arbitrary URLs with domain-aware fallbacks.

    Strategy:
    1) Wikipedia adapter via MediaWiki REST HTML.
    2) Generic HTML readability extraction with selector + scoring fallback.
    """

    HTTP_TIMEOUT_SECONDS = 15
    MAX_HTML_BYTES = 4 * 1024 * 1024
    MIN_TEXT_LENGTH = 120

    _GENERIC_SELECTORS: tuple[str, ...] = (
        "article",
        '[itemprop="articleBody"]',
        '[role="main"]',
        "main",
        ".article",
        ".article-body",
        ".article-content",
        ".post-content",
        ".entry-content",
        ".story-content",
        ".content",
    )

    _NOISE_TAGS: tuple[str, ...] = (
        "script",
        "style",
        "nav",
        "header",
        "footer",
        "aside",
        "form",
        "iframe",
        "svg",
        "button",
        "input",
        "select",
        "textarea",
        "template",
        "object",
    )

    _GENERIC_NOISE_SELECTORS: tuple[str, ...] = (
        ".ads",
        ".ad",
        ".advertisement",
        ".sponsored",
        ".promo",
        ".cookie",
        ".newsletter",
        ".social-share",
        ".share-buttons",
        ".comments",
        ".related",
    )

    _IMG_SOURCE_ATTRS: tuple[str, ...] = (
        "src",
        "data-src",
        "data-original",
        "data-lazy-src",
        "data-url",
        "data-image",
        "data-hi-res-src",
    )

    _IMG_SRCSET_ATTRS: tuple[str, ...] = (
        "srcset",
        "data-srcset",
        "data-lazy-srcset",
    )

    _PLACEHOLDER_IMAGE_PATTERNS: tuple[str, ...] = (
        "placeholder",
        "spacer",
        "blank.gif",
        "transparent",
        "pixel",
    )

    _WIKIPEDIA_NOISE_SELECTORS: tuple[str, ...] = (
        ".mw-editsection",
        ".reference",
        ".reflist",
        ".navbox",
        ".metadata",
        ".mw-authority-control",
        ".hatnote",
        ".toc",
        ".shortdescription",
    )

    _NON_ARTICLE_BLOCK_HINTS: tuple[str, ...] = (
        "gallery",
        "gal",
        "slider",
        "carousel",
        "widget",
        "schedule",
        "motivator",
        "banner",
        "promo",
        "social",
        "share",
        "sidebar",
        "logo",
    )

    async def extract(self, url: str) -> ArticleExtractionResult:
        """Extract a clean, readable article representation for a URL."""
        parsed = urlparse(url)
        headers = self._request_headers(parsed.netloc or "")

        async with httpx.AsyncClient(follow_redirects=True, timeout=self.HTTP_TIMEOUT_SECONDS) as client:
            if self._is_wikipedia_article_url(parsed):
                wikipedia_result = await self._try_extract_wikipedia(client, parsed, headers)
                if wikipedia_result:
                    return wikipedia_result

            response = await client.get(url, headers=headers)
            response.raise_for_status()

            if len(response.content) > self.MAX_HTML_BYTES:
                raise ArticleExtractionError("Page is too large to render.")

            content_type = (response.headers.get("content-type") or "").lower()
            if "html" not in content_type and "xml" not in content_type:
                raise ArticleExtractionError("Source is not an HTML document.")

            resolved_url = str(response.url)
            return self._extract_from_html(html=response.text, base_url=resolved_url)

    def _extract_from_html(
        self,
        html: str,
        base_url: str,
        *,
        title_hint: str | None = None,
        is_wikipedia: bool = False,
        license_name: str | None = None,
    ) -> ArticleExtractionResult:
        """Build a readable article payload from raw HTML."""
        soup = BeautifulSoup(html, "lxml")
        self._remove_noise(soup, is_wikipedia=is_wikipedia)

        title = title_hint or self._extract_title(soup)
        content_root = self._find_best_content_root(soup)
        if content_root is None:
            raise ArticleExtractionError("Could not identify readable content.")

        self._normalize_urls(content_root, base_url)
        self._prune_media_heavy_non_article_blocks(content_root)
        self._dedupe_redundant_images(content_root)
        self._inject_fallback_lead_image(soup, content_root, base_url)
        self._remove_dangerous_attributes(content_root)

        content_text = self._normalize_text(content_root.get_text(" ", strip=True))
        if len(content_text) < self.MIN_TEXT_LENGTH:
            raise ArticleExtractionError("No meaningful article text found.")

        attribution = f"Source: {urlparse(base_url).netloc}" if is_wikipedia else None
        if attribution and license_name:
            attribution = f"{attribution} ({license_name})"

        return ArticleExtractionResult(
            title=title,
            content_html=str(content_root),
            content_text=content_text,
            source_url=base_url,
            attribution=attribution,
            license=license_name,
        )

    async def _try_extract_wikipedia(
        self,
        client: httpx.AsyncClient,
        parsed: Any,
        headers: dict[str, str],
    ) -> ArticleExtractionResult | None:
        """Use MediaWiki REST to get high-quality article HTML for Wikipedia URLs."""
        title_key = self._extract_wikipedia_title_key(parsed)
        if not title_key:
            return None

        encoded_title = quote(title_key, safe=":_()")
        canonical_url = f"{parsed.scheme}://{parsed.netloc}/wiki/{encoded_title}"
        endpoints = (
            ("with_html_json", f"{parsed.scheme}://{parsed.netloc}/w/rest.php/v1/page/{encoded_title}/with_html"),
            ("mobile_html", f"{parsed.scheme}://{parsed.netloc}/api/rest_v1/page/mobile-html/{encoded_title}"),
        )

        for endpoint_kind, endpoint in endpoints:
            try:
                response = await client.get(endpoint, headers=headers)
                response.raise_for_status()

                if endpoint_kind == "with_html_json":
                    payload = response.json()
                    html = payload.get("html")
                    title = payload.get("title")
                    license_obj = payload.get("license") if isinstance(payload.get("license"), dict) else {}
                    license_name = license_obj.get("title")
                else:
                    html = response.text
                    title = None
                    license_name = "Creative Commons Attribution-ShareAlike 4.0"

                if not html:
                    continue

                return self._extract_from_html(
                    html=html,
                    base_url=canonical_url,
                    title_hint=title,
                    is_wikipedia=True,
                    license_name=license_name,
                )
            except Exception as exc:
                logger.info(f"[article_extract] Wikipedia adapter failed ({endpoint_kind}): {exc}")

        return None

    def _request_headers(self, host: str) -> dict[str, str]:
        """Provide browser-like headers to improve extraction success across origins."""
        return {
            "User-Agent": (
                "FocusDesktop/1.0 (+https://github.com/anthropics/focus; contact: support@focus.local) "
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": f"https://{host}/" if host else "https://www.google.com/",
        }

    def _remove_noise(self, soup: BeautifulSoup, *, is_wikipedia: bool) -> None:
        """Strip boilerplate and non-content nodes before article detection."""
        self._promote_noscript_images(soup)

        for tag in soup(self._NOISE_TAGS):
            tag.decompose()

        selectors = list(self._GENERIC_NOISE_SELECTORS)
        if is_wikipedia:
            selectors.extend(self._WIKIPEDIA_NOISE_SELECTORS)

        for selector in selectors:
            for node in soup.select(selector):
                node.decompose()

    def _find_best_content_root(self, soup: BeautifulSoup) -> Tag | None:
        """Find the most likely article container via selectors, then density scoring."""
        for selector in self._GENERIC_SELECTORS:
            node = soup.select_one(selector)
            if node and self._visible_text_length(node) >= self.MIN_TEXT_LENGTH:
                return node

        body = soup.find("body")
        if not body:
            return None

        best_node: Tag | None = None
        best_score = -1.0

        for candidate in body.find_all(["article", "main", "section", "div"], limit=250):
            text_len = self._visible_text_length(candidate)
            if text_len < 80:
                continue

            links_text = sum(self._visible_text_length(link) for link in candidate.find_all("a"))
            link_density = links_text / max(text_len, 1)
            paragraph_bonus = len(candidate.find_all("p")) * 40
            heading_bonus = len(candidate.find_all(["h1", "h2", "h3"])) * 24
            score = (text_len * (1.0 - min(link_density, 0.95))) + paragraph_bonus + heading_bonus

            if score > best_score:
                best_score = score
                best_node = candidate

        return best_node or body

    def _extract_title(self, soup: BeautifulSoup) -> str | None:
        """Extract title with fallbacks to OpenGraph and standard title tag."""
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title.get("content", "").strip() or None

        title_tag = soup.find("title")
        if title_tag:
            return title_tag.get_text(strip=True) or None

        h1 = soup.find("h1")
        if h1:
            return h1.get_text(strip=True) or None

        return None

    def _normalize_urls(self, root: Tag, base_url: str) -> None:
        """Resolve relative/protocol-relative URLs so rendered links remain functional."""
        for link in root.find_all("a"):
            href = link.get("href")
            if href:
                link["href"] = self._absolute_url(href, base_url)

        for img in root.find_all("img"):
            best_src = self._pick_best_media_source(img, self._IMG_SOURCE_ATTRS)
            if best_src:
                img["src"] = self._absolute_url(best_src, base_url)

            best_srcset = self._pick_best_media_source(img, self._IMG_SRCSET_ATTRS, allow_placeholder=True)
            if best_srcset:
                img["srcset"] = self._normalize_srcset(best_srcset, base_url)

            self._remove_hidden_image_styles(img)

        for source in root.find_all("source"):
            source_src = self._pick_best_media_source(source, ("src", "data-src", "data-url"), allow_placeholder=True)
            if source_src:
                source["src"] = self._absolute_url(source_src, base_url)

            source_srcset = self._pick_best_media_source(
                source,
                ("srcset", "data-srcset", "data-lazy-srcset"),
                allow_placeholder=True,
            )
            if source_srcset:
                source["srcset"] = self._normalize_srcset(source_srcset, base_url)

        for video in root.find_all("video"):
            poster = video.get("poster")
            if poster:
                video["poster"] = self._absolute_url(poster, base_url)

    def _remove_dangerous_attributes(self, root: Tag) -> None:
        """Drop inline event handlers; frontend sanitizer remains the final guard."""
        for element in root.find_all(True):
            for attr in list(element.attrs):
                if attr.lower().startswith("on"):
                    del element[attr]

    def _prune_media_heavy_non_article_blocks(self, root: Tag) -> None:
        """
        Remove likely non-article blocks that are mostly galleries/widgets.

        Why this exists:
        - Some sites wrap article text and promotional/gallery sections in one broad
          `.content` container.
        - Keeping those sections causes visually duplicated or irrelevant images.
        """
        candidates = list(root.find_all(["div", "section", "aside"]))
        for block in candidates:
            if block.parent is None or block.attrs is None:
                continue

            text_len = self._visible_text_length(block)
            img_count = len(block.find_all("img"))
            paragraph_count = len(block.find_all("p"))
            heading_count = len(block.find_all(["h1", "h2", "h3"]))
            attrs_blob = " ".join(
                [
                    *(block.get("class") or []),
                    block.get("id") or "",
                ]
            ).lower()

            has_non_article_hint = any(hint in attrs_blob for hint in self._NON_ARTICLE_BLOCK_HINTS)

            is_media_heavy_block = (
                (img_count >= 4 and text_len < 220 and paragraph_count == 0 and heading_count == 0)
                or (img_count >= 2 and text_len < 90 and paragraph_count == 0 and heading_count == 0)
            )

            if has_non_article_hint and img_count >= 1 and text_len < 500:
                block.decompose()
                continue

            if is_media_heavy_block:
                block.decompose()

    def _dedupe_redundant_images(self, root: Tag) -> None:
        """
        Remove duplicate images introduced by lazy-load + noscript fallbacks.

        Why this exists:
        - Many pages include both a lazy image tag and a noscript image fallback.
        - We normalize lazy attributes into `src`, which can make both tags resolve to
          the same URL and render twice.
        - The noscript fallback is often outside the same parent (for example when the
          primary image lives inside `<picture>`), so fallback duplicates are removed
          across the content root when a non-noscript match exists.
        - A secondary adjacent duplicate pass handles remaining same-parent duplicates.
        """
        noscript_fallback_attr = "data-noscript-fallback"
        images = list(root.find_all("img"))
        primary_keys: set[str] = set()

        for image in images:
            key = self._image_render_key(image)
            if key is None:
                continue
            if not self._is_noscript_fallback_image(image, noscript_fallback_attr):
                primary_keys.add(key)

        for image in images:
            if not self._is_noscript_fallback_image(image, noscript_fallback_attr):
                continue
            key = self._image_render_key(image)
            if key and key in primary_keys:
                image.decompose()

        last_parent: Tag | None = None
        last_key: str | None = None

        for image in list(root.find_all("img")):
            key = self._image_render_key(image)
            if key is None:
                continue

            parent = image.parent if isinstance(image.parent, Tag) else None
            if parent is not None and parent is last_parent and key == last_key:
                image.decompose()
                continue

            last_parent = parent
            last_key = key

        for image in root.find_all("img"):
            if noscript_fallback_attr in image.attrs:
                del image[noscript_fallback_attr]

    def _image_render_key(self, image: Tag) -> str | None:
        """Build a stable key for what image URL is expected to render."""
        src = (image.get("src") or "").strip()
        if src and not self._is_placeholder_image(src):
            return src

        srcset = (image.get("srcset") or "").strip()
        if srcset:
            for candidate in srcset.split(","):
                token = candidate.strip().split(" ", maxsplit=1)[0]
                if token and not self._is_placeholder_image(token):
                    return token

        return None

    def _is_noscript_fallback_image(self, image: Tag, marker_attr: str) -> bool:
        """Return True when an image node originates from a promoted noscript fallback."""
        marker = str(image.get(marker_attr, "")).strip().lower()
        return marker in {"1", "true", "yes"}

    def _promote_noscript_images(self, soup: BeautifulSoup) -> None:
        """Promote image fallbacks from <noscript> blocks before boilerplate cleanup."""
        noscript_fallback_attr = "data-noscript-fallback"
        for noscript in soup.find_all("noscript"):
            fragment = BeautifulSoup(noscript.decode_contents(), "lxml")
            fallback_image = fragment.find("img")
            if not fallback_image:
                noscript.decompose()
                continue

            replacement = soup.new_tag("img")
            for attr, value in fallback_image.attrs.items():
                replacement[attr] = value
            replacement[noscript_fallback_attr] = "1"
            noscript.replace_with(replacement)

    def _inject_fallback_lead_image(self, soup: BeautifulSoup, root: Tag, base_url: str) -> None:
        """Inject a lead image when content has no usable <img> but page metadata provides one."""
        if self._has_renderable_image(root):
            return

        lead_image_url = self._extract_lead_image_url(soup, base_url)
        if not lead_image_url:
            return

        figure = soup.new_tag("figure")
        image = soup.new_tag("img", src=lead_image_url, alt="")
        image["loading"] = "lazy"
        image["decoding"] = "async"
        figure.append(image)
        root.insert(0, figure)

    def _has_renderable_image(self, root: Tag) -> bool:
        """Return True when the content root already has at least one real image source."""
        for img in root.find_all("img"):
            src = (img.get("src") or "").strip()
            if src and not self._is_placeholder_image(src):
                return True

            srcset = (img.get("srcset") or "").strip()
            if srcset:
                first_candidate = srcset.split(",", maxsplit=1)[0].strip().split(" ", maxsplit=1)[0]
                if first_candidate and not self._is_placeholder_image(first_candidate):
                    return True
        return False

    def _extract_lead_image_url(self, soup: BeautifulSoup, base_url: str) -> str | None:
        """Read best-effort lead image URL from metadata when article body has none."""
        selectors = (
            ("meta", {"property": "og:image:secure_url"}, "content"),
            ("meta", {"property": "og:image"}, "content"),
            ("meta", {"name": "twitter:image"}, "content"),
            ("meta", {"name": "twitter:image:src"}, "content"),
            ("link", {"rel": "image_src"}, "href"),
        )

        for tag_name, attrs, value_attr in selectors:
            tag = soup.find(tag_name, attrs=attrs)
            if not tag:
                continue
            value = (tag.get(value_attr) or "").strip()
            if not value or self._is_placeholder_image(value):
                continue
            absolute = self._absolute_url(value, base_url)
            if "favicon" in absolute.lower():
                continue
            return absolute

        return None

    def _pick_best_media_source(
        self,
        element: Tag,
        attrs: tuple[str, ...],
        *,
        allow_placeholder: bool = False,
    ) -> str | None:
        """Return the first usable media source value across common lazy-loading attributes."""
        fallback_value: str | None = None

        for attr in attrs:
            value = (element.get(attr) or "").strip()
            if not value:
                continue
            if self._is_placeholder_image(value):
                if fallback_value is None:
                    fallback_value = value
                continue
            return value

        if allow_placeholder:
            return fallback_value
        return None

    def _is_placeholder_image(self, value: str) -> bool:
        """Detect transparent/placeholder image references that should be replaced when possible."""
        normalized = value.strip().lower()
        if not normalized:
            return True

        if normalized in {"#", "about:blank"}:
            return True

        if normalized.startswith("javascript:"):
            return True

        if normalized.startswith("data:image/gif;base64,r0lgod"):
            return True

        if normalized.startswith("data:image/svg+xml"):
            return True

        return any(pattern in normalized for pattern in self._PLACEHOLDER_IMAGE_PATTERNS)

    def _normalize_srcset(self, srcset: str, base_url: str) -> str:
        """Resolve each URL in a srcset value while preserving width/pixel-density descriptors."""
        normalized_entries: list[str] = []
        for candidate in srcset.split(","):
            token = candidate.strip()
            if not token:
                continue

            parts = token.split()
            url_part = parts[0]
            descriptor = " ".join(parts[1:])
            absolute = self._absolute_url(url_part, base_url)
            normalized_entries.append(f"{absolute} {descriptor}".strip())

        return ", ".join(normalized_entries)

    def _remove_hidden_image_styles(self, image: Tag) -> None:
        """Drop inline styles that keep lazy images invisible when JS hydration never runs."""
        style = (image.get("style") or "").lower()
        if not style:
            return

        if re.search(r"display\s*:\s*none", style):
            del image["style"]
            return
        if re.search(r"visibility\s*:\s*hidden", style):
            del image["style"]
            return
        if re.search(r"opacity\s*:\s*0(?:[\s;]|$)", style):
            del image["style"]
            return
        if re.search(r"height\s*:\s*0(?:[a-z%]+)?(?:[\s;]|$)", style):
            del image["style"]
            return
        if re.search(r"width\s*:\s*0(?:[a-z%]+)?(?:[\s;]|$)", style):
            del image["style"]

    def _absolute_url(self, value: str, base_url: str) -> str:
        """Resolve protocol-relative and relative URLs against the source page URL."""
        value = value.strip()
        if not value:
            return value
        if value.startswith("//"):
            return f"https:{value}"
        return urljoin(base_url, value)

    def _visible_text_length(self, node: Tag) -> int:
        """Approximate visible content weight used by the scoring fallback."""
        return len(self._normalize_text(node.get_text(" ", strip=True)))

    def _normalize_text(self, value: str) -> str:
        """Normalize whitespace for better indexing and comparison."""
        return re.sub(r"\s+", " ", value).strip()

    def _is_wikipedia_article_url(self, parsed: Any) -> bool:
        """Detect canonical Wikipedia article URLs that benefit from API extraction."""
        hostname = (parsed.hostname or "").lower()
        if not hostname.endswith(".wikipedia.org"):
            return False

        path = parsed.path or ""
        if not path.startswith("/wiki/"):
            return False

        title_fragment = path[len("/wiki/") :].strip("/")
        if not title_fragment or title_fragment.startswith("Special:"):
            return False

        return True

    def _extract_wikipedia_title_key(self, parsed: Any) -> str | None:
        """Parse and normalize the article title key from /wiki/{title} paths."""
        path = parsed.path or ""
        if not path.startswith("/wiki/"):
            return None

        title_fragment = path[len("/wiki/") :].split("/", maxsplit=1)[0]
        if not title_fragment:
            return None

        decoded = unquote(title_fragment).strip()
        if not decoded or decoded.startswith("Special:"):
            return None

        return decoded.replace(" ", "_")


article_extractor_service = ArticleExtractorService()
