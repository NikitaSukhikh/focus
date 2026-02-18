"""
Tests for article extraction helpers used by web-article rendering.

Why these tests exist:
- Keep link-to-reader fallback deterministic across content layouts.
- Prevent regressions in URL normalization and Wikipedia URL parsing logic.
"""

from urllib.parse import urlparse

from app.services.article_extractor_service import ArticleExtractorService


def _paragraph(seed: str, repeat: int = 18) -> str:
    return " ".join([f"{seed} keeps enough words for readability scoring."] * repeat)


def test_wikipedia_url_detection_and_title_key() -> None:
    service = ArticleExtractorService()

    parsed = urlparse("https://en.wikipedia.org/wiki/Alan_Turing")
    assert service._is_wikipedia_article_url(parsed) is True
    assert service._extract_wikipedia_title_key(parsed) == "Alan_Turing"

    special = urlparse("https://en.wikipedia.org/wiki/Special:Random")
    assert service._is_wikipedia_article_url(special) is False
    assert service._extract_wikipedia_title_key(special) is None


def test_extract_from_html_prefers_article_and_normalizes_relative_urls() -> None:
    service = ArticleExtractorService()
    html = f"""
    <html>
      <head><title>Example Story</title></head>
      <body>
        <nav>top navigation should be removed</nav>
        <article>
          <h1>Example Story</h1>
          <p>{_paragraph("Primary content paragraph")}</p>
          <a href="/about">About</a>
          <img src="/hero.png" />
        </article>
      </body>
    </html>
    """

    result = service._extract_from_html(html=html, base_url="https://example.com/news/story")

    assert result.title == "Example Story"
    assert "https://example.com/about" in result.content_html
    assert "https://example.com/hero.png" in result.content_html
    assert "top navigation" not in result.content_text


def test_extract_from_html_fallback_scores_main_content_block() -> None:
    service = ArticleExtractorService()
    html = f"""
    <html>
      <head><title>Scored Layout</title></head>
      <body>
        <div id="sidebar">
          <a href="/a">A</a><a href="/b">B</a><a href="/c">C</a>
        </div>
        <div id="main-content">
          <h2>Deep Dive</h2>
          <p>{_paragraph("Main block text")}</p>
          <p>{_paragraph("Additional context")}</p>
        </div>
      </body>
    </html>
    """

    result = service._extract_from_html(html=html, base_url="https://example.com/deep-dive")

    assert "Deep Dive" in result.content_html
    assert "Main block text" in result.content_text


def test_extract_from_html_promotes_lazy_images_and_noscript_fallbacks() -> None:
    service = ArticleExtractorService()
    html = f"""
    <html>
      <head>
        <title>Lazy Media Story</title>
        <meta property="og:image" content="/cover.jpg" />
      </head>
      <body>
        <article>
          <h1>Lazy Media Story</h1>
          <p>{_paragraph("Primary article content")}</p>
          <img
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
            data-src="/hero.jpg"
            data-srcset="/hero-480.jpg 480w, /hero-1280.jpg 1280w"
            style="display:none; opacity:0;"
          />
          <noscript><img src="/noscript.jpg" /></noscript>
        </article>
      </body>
    </html>
    """

    result = service._extract_from_html(html=html, base_url="https://example.com/story")

    assert 'src="https://example.com/hero.jpg"' in result.content_html
    assert "https://example.com/hero-480.jpg 480w" in result.content_html
    assert "https://example.com/hero-1280.jpg 1280w" in result.content_html
    assert 'style="display:none' not in result.content_html
    assert "https://example.com/noscript.jpg" in result.content_html


def test_extract_from_html_dedupes_matching_lazy_and_noscript_images() -> None:
    service = ArticleExtractorService()
    html = f"""
    <html>
      <head><title>Deduped Media Story</title></head>
      <body>
        <article>
          <h1>Deduped Media Story</h1>
          <p>{_paragraph("Primary article content")}</p>
          <img
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
            data-src="/hero.jpg"
            style="display:none;"
          />
          <noscript><img src="/hero.jpg" /></noscript>
        </article>
      </body>
    </html>
    """

    result = service._extract_from_html(html=html, base_url="https://example.com/story")

    assert result.content_html.count('src="https://example.com/hero.jpg"') == 1


def test_extract_from_html_dedupes_noscript_when_primary_image_is_in_picture() -> None:
    service = ArticleExtractorService()
    html = f"""
    <html>
      <head><title>Picture Wrapper Story</title></head>
      <body>
        <article>
          <h1>Picture Wrapper Story</h1>
          <p>{_paragraph("Primary article content")}</p>
          <picture>
            <source srcset="/hero.webp 1x" type="image/webp" />
            <img src="/hero.jpg" alt="hero" />
          </picture>
          <noscript><img src="/hero.jpg" alt="hero fallback" /></noscript>
        </article>
      </body>
    </html>
    """

    result = service._extract_from_html(html=html, base_url="https://example.com/story")

    assert result.content_html.count('src="https://example.com/hero.jpg"') == 1


def test_extract_from_html_prunes_media_heavy_gallery_blocks() -> None:
    service = ArticleExtractorService()
    html = f"""
    <html>
      <head><title>Gallery Heavy Story</title></head>
      <body>
        <div class="content">
          <h1>Gallery Heavy Story</h1>
          <p>{_paragraph("Primary article content")}</p>
          <p><img src="/article-image.jpg" /></p>
          <div class="mini-gal">
            <img src="/gallery-1.jpg" />
            <img src="/gallery-2.jpg" />
            <img src="/gallery-3.jpg" />
            <img src="/gallery-4.jpg" />
          </div>
          <div class="schedule">
            <img src="/schedule-1.jpg" />
            <img src="/schedule-2.jpg" />
          </div>
        </div>
      </body>
    </html>
    """

    result = service._extract_from_html(html=html, base_url="https://example.com/story")

    assert "https://example.com/article-image.jpg" in result.content_html
    assert "https://example.com/gallery-1.jpg" not in result.content_html
    assert "https://example.com/gallery-2.jpg" not in result.content_html
    assert "https://example.com/schedule-1.jpg" not in result.content_html
