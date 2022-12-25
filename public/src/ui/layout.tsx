import { app, Component } from 'apprun';
import resizable from './resizable';
import Calander from './calander';

const toggle_left_panel = () => {
  document.getElementById('left-panel').classList.toggle('hidden');
}

export default class extends Component {

  view = () => <div class="flex flex-col max-h-screen overflow-hidden">
    <div class="toolbar w-full p-3 flex flex-row" id="toolbar">
      <a class="toolbar-button mx-1" onclick={toggle_left_panel}>
        <i class="">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg></i></a>
      <a class="mx-1">
        <i class="">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="10" cy="10" r="7"></circle><line x1="21" y1="21" x2="15" y2="15"></line></svg>
        </i></a>
      <a class="mx-1"><i class=""></i>
        <span class=""><svg xmlns="http://www.w3.org/2000/svg" class="i" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle></svg></span>
      </a>
    </div>
    <div class="flex overflow-hidden">
      <div class="w-12 bg-gray-300" id="left-icons">
      </div>
      <div class="w-64 p-4 min-w-max hidden bg-gray-100" id="left-panel">
        <Calander />
      </div>
      {/* <div class="resizer bg-white" data-direction='horizontal'></div> */}
      <div class="overflow-scroll w-full p-4" id="main-panel">
        <div id='my-app'></div>
      </div>
      <div class="resizer bg-gray-200" data-direction='horizontal'></div>
      <div id="right-panel" class="flex-1 flex flex-col">
        <div id="right-panel-top" class="h-full overflow-scroll"></div>
        <div class="resizer bg-gray-200" data-direction='vertical'></div>
        <div id="right-panel-bottom" class="flex-1 overflow-scroll"></div>
      </div>
    </div>
    <div id="floating" class="absolute left-0 top-0 max-w-max hidden">
      Tooltip
      <div id="arrow" class="absolute"></div>
    </div>
  </div>;

  rendered = () => {
    const w = window.innerWidth - 4 -
      48 - // document.getElementById('left-icons').getBoundingClientRect().width -
      //208 -  //document.getElementById('left-panel').getBoundingClientRect().width;
      0 // document.getElementById('right-panel').getBoundingClientRect().width;
    document.getElementById('main-panel').style.width = `${w}px`;
    document.querySelectorAll('.resizer').forEach(function (ele) {
      resizable(ele);
    });
  }
}