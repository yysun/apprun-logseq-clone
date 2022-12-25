import { app, Component } from 'apprun';
import ToolBar from './top-toolbar';
import resizable from './resizable';
import Calander from './calander';

const toggle_left_panel = () => {
  document.getElementById('left-panel').classList.toggle('hidden');
}

export default () => <>
  <div id="left-panel" class="h-screen flex-1">
    <div id="left-tool-bar" class="h-10 w-full sticky z-10">
      <ToolBar />
    </div>
    <div id="left-main" class="flex-1 flex flex-row pl-64">
      <div id="left-drawer" class="absolute top-0 left-0 w-64 h-screen overflow-scroll bg-gray-100">

      </div>
      <div id="left-content" class="flex-1 overflow-scroll">
        <div id="my-app"></div>
      </div>
    </div>
  </div>
  <div class="resizer bg-gray-200 w-1 h-screen" data-direction='horizontal' ref={e => resizable(e)}></div>
  <div id="right-panel" class="w-1 h-screen"></div>

  <div id="floating" class="absolute left-0 top-0 max-w-max hidden">
    Tooltip
    <div id="arrow" class="absolute"></div>
  </div>
</>