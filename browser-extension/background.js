const API_URL = 'http://localhost:3000/api';

const DEFAULT_WEBSITES = [
  { name: 'VnExpress', domain: 'vnexpress.net' },
  { name: 'Dân Trí', domain: 'dantri.com.vn' },
  { name: 'Tuổi Trẻ', domain: 'tuoitre.vn' },
];

async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function setStorage(data) {
  return chrome.storage.local.set(data);
}

function getDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function refreshTrackedWebsites() {
  try {
    const response = await fetch(`${API_URL}/websites/tracked`);

    if (!response.ok) {
      throw new Error();
    }

    const trackedWebsites = await response.json();

    await setStorage({
      trackedWebsites,
      backendOnline: true,
    });

    return trackedWebsites;
  } catch {
    const stored = await getStorage(['trackedWebsites']);
    const trackedWebsites = stored.trackedWebsites || DEFAULT_WEBSITES;

    await setStorage({
      trackedWebsites,
      backendOnline: false,
    });

    return trackedWebsites;
  }
}

async function findTrackedWebsite(url) {
  const domain = getDomain(url);
  const websites = await refreshTrackedWebsites();

  return websites.find((website) => website.domain === domain) || null;
}

async function queueEvent(event) {
  const stored = await getStorage(['pendingEvents']);
  const pendingEvents = stored.pendingEvents || [];

  pendingEvents.push(event);

  await setStorage({
    pendingEvents,
    backendOnline: false,
  });
}

async function sendEvent(event) {
  try {
    const response = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error();
    }

    await setStorage({
      backendOnline: true,
      lastSyncAt: Date.now(),
    });
  } catch {
    await queueEvent(event);
  }
}

async function flushPendingEvents() {
  const stored = await getStorage(['pendingEvents']);
  const pendingEvents = stored.pendingEvents || [];

  if (!pendingEvents.length) {
    try {
      const response = await fetch(`${API_URL}`);

      if (!response.ok) {
        throw new Error();
      }

      await setStorage({
        backendOnline: true,
        lastSyncAt: Date.now(),
      });

      return {
        success: true,
        pending: 0,
      };
    } catch {
      await setStorage({
        backendOnline: false,
      });

      return {
        success: false,
        pending: 0,
      };
    }
  }

  try {
    const response = await fetch(`${API_URL}/events/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: pendingEvents,
      }),
    });

    if (!response.ok) {
      throw new Error();
    }

    await setStorage({
      pendingEvents: [],
      backendOnline: true,
      lastSyncAt: Date.now(),
    });

    return {
      success: true,
      pending: 0,
    };
  } catch {
    await setStorage({
      backendOnline: false,
    });

    return {
      success: false,
      pending: pendingEvents.length,
    };
  }
}

async function getSessions() {
  const stored = await getStorage(['tabSessions']);
  return stored.tabSessions || {};
}

async function saveSessions(tabSessions) {
  await setStorage({
    tabSessions,
  });
}

async function stopUntrackedSessions(websites) {
  const tabSessions = await getSessions();
  const trackedDomains = new Set(
    websites.map((website) => website.domain),
  );
  for (const [tabId, session] of Object.entries(tabSessions)) {
    if (!trackedDomains.has(session.domain)) {
      await finishSession(Number(tabId));
    }
  }
}

function buildEvent(
  session,
  eventType,
  page,
  occurredAt = new Date().toISOString(),
) {
  session.clientSeq += 1;

  return {
    eventId: crypto.randomUUID(),
    sessionId: session.sessionId,
    clientSeq: session.clientSeq,
    eventType,
    url: session.url,
    title: session.title,
    occurredAt,
    ...(page && { page }),
    browser: {
      tabId: session.tabId,
      windowId: session.windowId,
    },
  };
}

function updateLocalTime(session) {
  if (session.state === 'ACTIVE' && session.activeSince) {
    session.activeReadingMs += Date.now() - session.activeSince;
    session.activeSince = null;
  }
}

async function transitionReadingState(tabId, shouldBeActive) {
  const tabSessions = await getSessions();
  const session = tabSessions[tabId];

  if (!session || session.state === 'ENDED') {
    return;
  }

  const nextState = shouldBeActive ? 'ACTIVE' : 'INACTIVE';

  if (session.state === nextState) {
    return;
  }

  if (nextState === 'ACTIVE') {
    session.activeSince = Date.now();
  } else {
    updateLocalTime(session);
  }

  session.state = nextState;

  const event = buildEvent(
    session,
    nextState === 'ACTIVE' ? 'PAGE_ACTIVE' : 'PAGE_INACTIVE',
  );

  session.lastObservedAt = Date.parse(event.occurredAt);

  await saveSessions(tabSessions);
  await sendEvent(event);
}

async function evaluateReadingState(tabId) {
  const tabSessions = await getSessions();
  const session = tabSessions[tabId];

  if (!session || session.state === 'ENDED') {
    return;
  }

  let tab;

  try {
    tab = await chrome.tabs.get(Number(tabId));
  } catch {
    return;
  }

  let browserWindow;

  try {
    browserWindow = await chrome.windows.get(session.windowId);
  } catch {
    return;
  }

  const isReading =
    tab.active === true &&
    browserWindow.focused === true &&
    session.pageVisible === true &&
    session.readingActive === true;

  await transitionReadingState(Number(tabId), isReading);
}

async function reevaluateAllSessions() {
  const tabSessions = await getSessions();

  for (const tabId of Object.keys(tabSessions)) {
    await evaluateReadingState(Number(tabId));
  }
}

async function checkpointSessions() {
  const tabSessions = await getSessions();
  let changed = false;

  for (const [tabId, session] of Object.entries(tabSessions)) {
    try {
      const tab = await chrome.tabs.get(Number(tabId));

      if (tab.url === session.url) {
        session.lastObservedAt = Date.now();
        changed = true;
      }
    } catch {
    }
  }

  if (changed) {
    await saveSessions(tabSessions);
  }
}

async function reconcileStoredSessions() {
  const tabSessions = await getSessions();

  for (const [tabId, session] of Object.entries(tabSessions)) {
    try {
      const tab = await chrome.tabs.get(Number(tabId));

      if (tab.url === session.url) {
        continue;
      }
    } catch {
    }

    await finishSession(
      Number(tabId),
      session.lastObservedAt || Date.now(),
    );
  }
}

async function startSession(tabId, windowId, page, visible) {
  let tabSessions = await getSessions();
  const current = tabSessions[tabId];

  if (current && current.url === page.url) {
    current.pageVisible = visible;
    current.title = page.title;
    current.domain = page.domain;
    current.readingActive = true;

    await saveSessions(tabSessions);
    await evaluateReadingState(tabId);
    return;
  }

  if (current) {
    await finishSession(tabId);
    tabSessions = await getSessions();
  }

  const session = {
    sessionId: crypto.randomUUID(),
    tabId,
    windowId,
    url: page.url,
    domain: page.domain,
    title: page.title,
    clientSeq: 0,
    state: 'ACTIVE',
    activeReadingMs: 0,
    activeSince: Date.now(),
    pageVisible: visible,
    readingActive: true,
    lastObservedAt: Date.now(),
  };

  tabSessions[tabId] = session;

  const enterEvent = buildEvent(
    session,
    'PAGE_ENTER',
    page,
  );

  session.lastObservedAt = Date.parse(
    enterEvent.occurredAt,
  );

  await saveSessions(tabSessions);
  await sendEvent(enterEvent);
  await evaluateReadingState(tabId);
}

async function setPageVisibility(tabId, visible) {
  const tabSessions = await getSessions();
  const session = tabSessions[tabId];

  if (!session) {
    return;
  }

  session.pageVisible = visible;

  if (visible) {
    session.readingActive = true;
  }

  await saveSessions(tabSessions);
  await evaluateReadingState(tabId);
}

async function setReadingActive(tabId, active) {
  const tabSessions = await getSessions();
  const session = tabSessions[tabId];

  if (!session) {
    return;
  }

  session.readingActive = active;

  await saveSessions(tabSessions);
  await evaluateReadingState(tabId);
}

async function finishSession(tabId, endedAt = Date.now()) {
  const tabSessions = await getSessions();
  const session = tabSessions[tabId];

  if (!session) {
    return;
  }

  updateLocalTime(session);

  session.state = 'ENDED';
  session.activeSince = null;

  const leaveEvent = buildEvent(
    session,
    'PAGE_LEAVE',
    undefined,
    new Date(endedAt).toISOString(),
  );

  delete tabSessions[tabId];

  await saveSessions(tabSessions);
  await sendEvent(leaveEvent);
}

async function getPopupState() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const stored = await getStorage([
    'trackedWebsites',
    'backendOnline',
    'tabSessions',
  ]);

  const session = tab
    ? stored.tabSessions?.[tab.id]
    : null;

  const domain = tab?.url
    ? getDomain(tab.url)
    : '';

  const supported = (
    stored.trackedWebsites || DEFAULT_WEBSITES
  ).some(
    (website) => website.domain === domain,
  );

  const activeReadingMs =
    (session?.activeReadingMs || 0) +
    (
      session?.state === 'ACTIVE' &&
      session.activeSince
        ? Date.now() - session.activeSince
        : 0
    );

  return {
    backendOnline: stored.backendOnline !== false,
    supported,
    domain,
    title: session?.title || tab?.title || '',
    state: session?.state || null,
    activeReadingMs,
  };
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await getStorage([
    'pendingEvents',
    'tabSessions',
  ]);

  await setStorage({
    pendingEvents: stored.pendingEvents || [],
    tabSessions: stored.tabSessions || {},
  });

  await refreshTrackedWebsites();

  chrome.alarms.create('sync', {
    periodInMinutes: 1,
  });

  await reevaluateAllSessions();
  await checkpointSessions();
});

chrome.runtime.onStartup.addListener(async () => {
  chrome.alarms.create('sync', {
    periodInMinutes: 1,
  });

  const websites = await refreshTrackedWebsites();

  await reconcileStoredSessions();
  await stopUntrackedSessions(websites);
  await flushPendingEvents();
  await reevaluateAllSessions();
  await checkpointSessions();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'sync') {
    return;
  }

  await flushPendingEvents();

  const websites = await refreshTrackedWebsites();

  await stopUntrackedSessions(websites);
  await reevaluateAllSessions();
  await checkpointSessions();
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await setPageVisibility(tabId, true);
  await reevaluateAllSessions();
});

chrome.windows.onFocusChanged.addListener(async () => {
  await reevaluateAllSessions();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  finishSession(tabId);
});

chrome.tabs.onUpdated.addListener(
  (tabId, changeInfo) => {
    if (changeInfo.url) {
      finishSession(tabId);
    }
  },
);

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    (async () => {
      if (message.type === 'IS_TRACKED') {
        const website = await findTrackedWebsite(message.url);
        sendResponse({
          tracked: Boolean(website),
          config: website ?
              {
                titleSelector: website.titleSelector,
                contentSelector: website.contentSelector,
              }
            : null,
        });
        return;
      }

      if (message.type === 'PAGE_READY' && sender.tab) {
        await startSession(
          sender.tab.id,
          sender.tab.windowId,
          message.page,
          message.visible,
        );

        sendResponse({
          success: true,
        });

        return;
      }

      if (message.type === 'PAGE_VISIBILITY' && sender.tab) {
        await setPageVisibility(
          sender.tab.id,
          message.visible,
        );

        sendResponse({
          success: true,
        });

        return;
      }

      if (
        message.type === 'PAGE_READING_STATE' &&
        sender.tab
      ) {
        await setReadingActive(
          sender.tab.id,
          message.active,
        );

        sendResponse({
          success: true,
        });

        return;
      }

      if (message.type === 'PAGE_NOT_ARTICLE' && sender.tab) {
        await finishSession(sender.tab.id);

        sendResponse({
          success: true,
        });

        return;
      }

      if (message.type === 'GET_STATE') {
        sendResponse(
          await getPopupState(),
        );
      }
    })();

    return true;
  },
);
