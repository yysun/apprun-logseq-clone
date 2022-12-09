import app from 'apprun';

const toggle_left_panel = () => {
  document.getElementById('left-panel').classList.toggle('open');
}

export default () => <div class="vh-100">
  <main class="main">
    <div class="container-fliud d-flex p-2 fs-4" id="toolbar">
      <a class="ms-2" onclick={toggle_left_panel}><i class="px-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg></i></a>
      <a class="ms-2"><i class="px-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="10" cy="10" r="7"></circle><line x1="21" y1="21" x2="15" y2="15"></line></svg>
      </i></a>
      <a class="ms-auto ms-2"><i class="ti ti-brand-tabler"></i></a>
      <a class="ms-2"><i class="ti ti-brand-tabler"></i></a>
    </div>

    <div class="container-fliud d-flex">
      <div class="vh-100 open" id="left-panel">
        <aside class="px-4">Keywords</aside>
      </div>
      <div class="vh-100 flex-grow-1 overflow-scroll" id="main-panel">
        <div class="px-4" id='my-app'></div>
      </div>
    </div>
  </main>
</div>;