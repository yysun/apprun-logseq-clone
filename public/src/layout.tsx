import app from 'apprun';

const toggle_left_panel = () => {
  document.getElementById('left-panel').classList.toggle('hidden');
}

export default () => <>
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

  <div class="flex">
    <div class="w-64 max-h-screen p-4 hidden" id="left-panel">
      <aside class="">Keywords</aside>
    </div>
    <div class="flex-1 max-h-screen overflow-scroll p-4" id="main-panel">
      <div class="max-w-2xl mx-auto" id='my-app'></div>
    </div>
  </div>
</>;