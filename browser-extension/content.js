(() => {
  let started = false;

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

  function copyShadowRoots(source, target, targetDocument) {
    const sourceElements = [...source.querySelectorAll('*')];
    const targetElements = [...target.querySelectorAll('*')];

    sourceElements.forEach((element, index) => {
      if (!element.shadowRoot || !targetElements[index]) {
        return;
      }

      const container = targetDocument.createElement('div');
      element.shadowRoot.childNodes.forEach(node => {
        container.appendChild(node.cloneNode(true));
      });
      targetElements[index].appendChild(container);
      copyShadowRoots(element.shadowRoot, container, targetDocument);
    });
  }

  function cloneDocument() {
    const clone = document.cloneNode(true);
    copyShadowRoots(document, clone, clone);
    return clone;
  }

  function extractConfiguredArticle(config) {
    let title = '';
    let content = '';

    try {
      const titleElement = document.querySelector(config.titleSelector);
      const contentElement = document.querySelector(config.contentSelector);
      title = String(titleElement?.textContent || '').trim();
      content = String(
        contentElement?.innerText || contentElement?.textContent || '',
      ).replace(/\s+/g, ' ').trim();
    } catch {}

    return { article: { title }, content };
  }

  function extractArticle(config) {
    if (hasConfig(config)) {
      return extractConfiguredArticle(config);
    }

    try {
      const article = new Readability(cloneDocument()).parse();
      const content = String(article?.textContent || '').replace(/\s+/g, ' ').trim();
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
  }

  document.addEventListener('visibilitychange', () => {
    if (started) {
      chrome.runtime.sendMessage({
        type: 'PAGE_VISIBILITY',
        visible: !document.hidden,
      });
    }
  });

  start();
})();
