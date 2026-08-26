let state = null;
let timerId = null;

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function renderCurrentArticle() {
  const currentTabInfo = document.getElementById('currentTabInfo');

  if (!state.supported) {
    currentTabInfo.textContent = `${state.domain || 'This page'} is not supported`;
    return;
  }

  if (!state.state) {
    currentTabInfo.textContent = 'Open a news article to start tracking';
    return;
  }

  const title = document.createElement('strong');
  const domain = document.createElement('span');
  title.textContent = state.title || 'Untitled article';
  domain.className = 'tab-domain';
  domain.textContent = state.domain;
  currentTabInfo.replaceChildren(title, domain);
}

function render() {
  const statusDot = document.getElementById('statusDot');
  statusDot.classList.toggle('error', !state.backendOnline);

  if (state.backendOnline) {
    document.getElementById('statusText').textContent = 'Your reading data is synced';
    document.getElementById('statusDetails').textContent = 'Everything is up to date';
  } else {
    document.getElementById('statusText').textContent = 'Sync temporarily unavailable';
    document.getElementById('statusDetails').textContent = 'Your activity will sync automatically later';
  }

  renderCurrentArticle();
  const stateLabels = {
    ACTIVE: 'Reading now',
    INACTIVE: 'Paused',
    ENDED: 'Finished',
  };
  document.getElementById('readingState').textContent = stateLabels[state.state] || '--';
  document.getElementById('activeTime').textContent = formatTime(state.activeReadingMs);
}

async function loadState() {
  state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  render();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  timerId = window.setInterval(loadState, 1000);
});

window.addEventListener('unload', () => {
  window.clearInterval(timerId);
});
