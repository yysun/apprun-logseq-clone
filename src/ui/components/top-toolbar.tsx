import app from 'apprun';

let sidebarButton: HTMLElement;
let sidebarOpen = true;

const updateSidebarIcon = (isOpen: boolean) => {
  if (!sidebarButton) return;
  sidebarOpen = isOpen;
  sidebarButton.innerHTML = isOpen ?
    // Open state - show panel icon
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="9" y1="4" x2="9" y2="20"></line></svg>` :
    // Closed state - show hamburger icon
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;
  sidebarButton.setAttribute('title', isOpen ? 'close sidebar' : 'open sidebar');
};

const toggleSidebar = () => {
  app.run('@toggle-left-drawer');
  updateSidebarIcon(!sidebarOpen);
};

// Detect if running in Electron - check multiple indicators
const isElectron = (() => {
  // Check if preload script exposed electronAPI
  if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
    console.log('Electron detected via electronAPI');
    return true;
  }

  // Check user agent
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('electron')) {
    console.log('Electron detected via user agent');
    return true;
  }

  console.log('Running in browser mode');
  return false;
})();

console.log('isElectron:', isElectron);

export default () => {
  const buttonMargin = isElectron ? 'ml-20' : 'ml-2';

  return <div class='flex h-full items-center px-3 title-bar'>
    <a class={`toolbar-button ${buttonMargin}`} onclick={toggleSidebar} title="close sidebar" ref={el => { sidebarButton = el; updateSidebarIcon(true); }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="9" y1="4" x2="9" y2="20"></line></svg>
    </a>
    <span class="flex-1"></span>
    <a class="toolbar-button" href="/page/pages/[new]" title="add page">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-circle-plus" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="font-size: 20px;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="12" cy="12" r="9"></circle><line x1="9" y1="12" x2="15" y2="12"></line><line x1="12" y1="9" x2="12" y2="15"></line></svg>
    </a>
    <a class="toolbar-button" href="/journals" title="journals">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-calendar" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="5" width="16" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="4" y1="11" x2="20" y2="11"></line><line x1="11" y1="15" x2="12" y2="15"></line><line x1="12" y1="15" x2="12" y2="18"></line></svg>
    </a>
    <a class="toolbar-button" href="/pages" title="all pages">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-files" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M15 3v4a1 1 0 0 0 1 1h4"></path><path d="M18 17h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h4l5 5v7a2 2 0 0 1 -2 2z"></path><path d="M16 17v2a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h2"></path></svg>
    </a>
    <a class="toolbar-button" $onclick="@search-results" title="search">
      <i class="">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="10" cy="10" r="7"></circle><line x1="21" y1="21" x2="15" y2="15"></line></svg>
      </i>
    </a>
    <a class="toolbar-button" onclick="history.back()" title="alt+left">
      <i>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="5" y1="12" x2="19" y2="12"></line><line x1="5" y1="12" x2="11" y2="18"></line><line x1="5" y1="12" x2="11" y2="6"></line></svg>
      </i>
    </a>
    <a class="toolbar-button" onclick="history.forward()" title="alt+right">
      <i>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="5" y1="12" x2="19" y2="12"></line><line x1="13" y1="18" x2="19" y2="12"></line><line x1="13" y1="6" x2="19" y2="12"></line></svg>
      </i>
    </a>
    <a class="toolbar-button">
      <i class=""><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle></svg></i>
    </a>
    <a class="toolbar-button" $onclick="@toggle-right-panel" title="toggle right panel">
      <i class="">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="15" y1="4" x2="15" y2="20"></line></svg>
      </i>
    </a>

  </div>;
};