import app from 'apprun';
export default () => <div class='flex h-full p-3'>
  <a class="my-auto mx-1" $onclick="toggle_left_panel">
    <i class="">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg></i></a>
  <a class="my-auto mx-1">
    <i class="">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="10" cy="10" r="7"></circle><line x1="21" y1="21" x2="15" y2="15"></line></svg>
    </i></a>
  <span class="flex-1"></span>
  <a class="my-auto mx-1"><i class=""></i>
    <span class=""><svg xmlns="http://www.w3.org/2000/svg" class="i" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle></svg></span>
  </a>
  <a class="my-auto mx-1"><i class=""></i>
    <span class="">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-layout-sidebar-right" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="15" y1="4" x2="15" y2="20"></line></svg>
    </span>
  </a>

</div>;