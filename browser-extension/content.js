(() => {
  let started = false;
  const READING_TIMEOUT_MS = 45_000;

  let readingTimer = null;
  let readingActive = false;

  function setReadingActive(active) {
    if (readingActive === active) {
      return;
    }

    readingActive = active;

    chrome.runtime.sendMessage({
      type: 'PAGE_READING_STATE',
      active,
    });
  }

  function resetReadingTimer() {
    clearTimeout(readingTimer);

    setReadingActive(true);

    readingTimer = setTimeout(() => {
      setReadingActive(false);
    }, READING_TIMEOUT_MS);
  }

  function isOriginPage(url) {
    return new URL(url).pathname.replace(/\/+$/, '') === '';
  }

  function looksLikeArticle(article, content) {
    return Boolean(article?.title?.trim() && content);
  }

  async function stopSession() {
    await chrome.runtime.sendMessage({ type: 'PAGE_NOT_ARTICLE' });
  }

  function hasConfig(config) {
    return Boolean(config?.titleSelector && config?.contentSelector);
  }

  function getConfiguredElements(config) {
    if (!hasConfig(config)) {
      return null;
    }

    try {
      const title = document.querySelector(config.titleSelector);
      const content = document.querySelector(config.contentSelector);
      return title && content ? { title, content } : null;
    } catch {
      return null;
    }
  }

  function hasReadableContent(config) {
    if (hasConfig(config)) {
      return Boolean(getConfiguredElements(config));
    }

    const root = document.querySelector('[itemprop~="articleBody"], article, main');
    if (String(root?.textContent || '').trim().length >= 300) {
      return true;
    }

    let length = 0;
    document.querySelectorAll('p').forEach(paragraph => {
      const text = String(paragraph.textContent || '').trim();
      if (text.length >= 25) {
        length += text.length;
      }
    });
    return length >= 500;
  }

  function waitForReadableContent(config) {
    if (hasReadableContent(config)) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      const observer = new MutationObserver(() => {
        if (hasReadableContent(config)) {
          finish();
        }
      });
      const timeoutId = setTimeout(finish, 15000);

      function finish() {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve();
      }

      observer.observe(document.documentElement, {
        childList: true,
        characterData: true,
        subtree: true,
      });

      if (hasReadableContent(config)) {
        finish();
      }
    });
  }

  function copyShadowContentIntoClone(sourceRoot, clonedRoot) {
    const sourceElements = [...sourceRoot.querySelectorAll('*')];
    const clonedElements = [...clonedRoot.querySelectorAll('*')];

    sourceElements.forEach((sourceElement, index) => {
      const shadowRoot = sourceElement.shadowRoot;
      const clonedElement = clonedElements[index];

      if (!shadowRoot || !clonedElement) {
        return;
      }

      const clonedDocument = clonedElement.ownerDocument || clonedRoot;
      const shadowContainer = clonedDocument.createElement('div');

      shadowRoot.childNodes.forEach(node => {
        shadowContainer.appendChild(node.cloneNode(true));
      });

      clonedElement.appendChild(shadowContainer);

      copyShadowContentIntoClone(shadowRoot, shadowContainer);
    });
  }

  function cloneDocument() {
    const clonedDocument = document.cloneNode(true);

    copyShadowContentIntoClone(document, clonedDocument);

    return clonedDocument;
  }

  function normalizeInlineText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function extractTextContent(root) {
    if (!root) {
      return '';
    }

    const selector = 'p, h2, h3, h4, blockquote, pre';
    const blocks = [...root.querySelectorAll(selector)]
      .filter(element => !element.querySelector(selector))
      .map(element => normalizeInlineText(element.textContent))
      .filter(Boolean);

    if (blocks.length) {
      return blocks.join('\n\n');
    }

    return String(root.innerText || root.textContent || '')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(normalizeInlineText)
      .filter(Boolean)
      .join('\n\n');
  }

  function extractConfiguredArticle(config) {
    let title = '';
    let content = '';

    try {
      const titleElement = document.querySelector(config.titleSelector);
      const contentElement = document.querySelector(config.contentSelector);
      title = normalizeInlineText(titleElement?.textContent);
      content = extractTextContent(contentElement);
    } catch {}

    return { article: { title }, content };
  }

  function extractArticle(config) {
    if (hasConfig(config)) {
      return extractConfiguredArticle(config);
    }

    try {
      const article = new Readability(cloneDocument()).parse();

      if (!article) {
        return null;
      }

      const articleElement = document.createElement('div');
      articleElement.innerHTML = article.content || '';
      article.title = normalizeInlineText(article.title);
      const content = extractTextContent(articleElement);

      return looksLikeArticle(article, content) ? { article, content } : null;
    } catch {
      return null;
    }
  }

  async function start() {
    if (started) {
      return;
    }

    const url = window.location.href;

    if (isOriginPage(url)) {
      await stopSession();
      return;
    }

    const tracked = await chrome.runtime.sendMessage({ type: 'IS_TRACKED', url });

    if (!tracked?.tracked) {
      return;
    }

    await waitForReadableContent(tracked.config);
    const result = extractArticle(tracked.config);

    if (!result) {
      await stopSession();
      return;
    }

    const { article, content } = result;
    started = true;

    await chrome.runtime.sendMessage({
      type: 'PAGE_READY',
      page: {
        url,
        domain: window.location.hostname.toLowerCase().replace(/^www\./, ''),
        title: article.title.trim(),
        content,
      },
      visible: !document.hidden,
    });

    resetReadingTimer();
  }

  function handleReadingActivity() {
    if (started) {
      resetReadingTimer();
    }
  }

  window.addEventListener('scroll', handleReadingActivity, { passive: true });
  window.addEventListener('pointerdown', handleReadingActivity, { passive: true });
  window.addEventListener('keydown', handleReadingActivity);

  document.addEventListener('visibilitychange', () => {
    if (started) {
      if (!document.hidden) {
        resetReadingTimer();
      }

      chrome.runtime.sendMessage({
        type: 'PAGE_VISIBILITY',
        visible: !document.hidden,
      });
    }
  });

  start();
})();
