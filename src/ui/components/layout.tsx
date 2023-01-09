import app from 'apprun';
import ToolBar from './top-toolbar';
import resizable from '../utils/resizable';
import Sidebar from './sidebar';

app.on('@toggle-left-drawer', () => {
  const drawer = document.getElementById('left-drawer');
  const main = document.getElementById('left-panel-container');
  if (!drawer.style.left || drawer.style.left === '0px') {
    drawer.style.left = '-1000px';
    main.style.paddingLeft = '0px';
  } else {
    drawer.style.left = '0px';
    main.style.paddingLeft = '224px'; //w-56
  }
});

app.on('@toggle-right-panel', () => {
  const panel = document.getElementById('right-panel');
  const main = document.getElementById('left-panel-container');
  const width = parseInt((panel.style.width || '0px').replace('px', ''));
  if (width < 10) {
    panel.style.width = main.clientWidth / 2 + 'px';
  } else {
    panel.style.width = '4px';
  }
});

app.on('@show-right-panel', () => {
  const panel = document.getElementById('right-panel');
  const width = parseInt((panel.style.width || '0px').replace('px', ''));
  const main = document.getElementById('left-panel-container');
  const new_width = (main.clientWidth - 224 - 4) / 2;
  if (width < 10) {
    panel.style.width = new_width + 'px';
    document.getElementById('left-panel').style.width = new_width + 'px';
  }
});

export default () => <>
  <div id="left-panel" class="h-screen flex-1">
    <div id="left-toolbar" class="h-10 w-full sticky z-20">
      <ToolBar />
    </div>
    <div id="left-panel-container" class="flex-1 flex flex-row pl-64">
      <div id="left-drawer" class="absolute top-0 left-0 w-56 h-screen overflow-scroll
      transition-all duration-150 bg-gray-100">
        <Sidebar />
      </div>
      <div id="left-panel-main" class="flex-1 h-screen overflow-scroll pb-24">
        <div id="my-app"></div>
      </div>
    </div>
  </div>
  <div class="resizer bg-gray-200 w-1 h-screen" data-direction='horizontal' ref={e => resizable(e)}></div>
  <div id="right-panel" class="w-1 h-screen transition-all duration-150">
    <div id="right-panel-toolbar" class="h-9 w-full sticky z-10 border-b border-gray-100 flex">
      <span class="flex-1"></span>
      <button class="right-panel-toolbar-button">Search</button>
    </div>
    <div id="right-panel-main" class="h-screen overflow-scroll pb-24 p-4"></div>
  </div>

  <div id="floating" class="absolute left-0 top-0 max-w-max hidden">
    Tooltip
    <div id="arrow" class="absolute"></div>
  </div>
  <div id="for-popups"></div>
</>