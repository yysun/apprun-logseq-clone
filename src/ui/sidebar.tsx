import app from 'apprun';
import Calender from './calander';

let menu;
const toggle_popup = e => {
  e.preventDefault();
  e.stopPropagation();
  // menu = e.target.closest('li').querySelector('ul');
  const close_menu = () => menu.classList.add('hidden');
  menu.classList.toggle('hidden');
  if (menu.classList.contains('hidden')) {
    window.removeEventListener('click', close_menu);
  } else {
    window.addEventListener('click', close_menu);
  }
}

const toggle_calendar = e => {
  e.preventDefault();
  const calender = document.querySelector('.calendar');
  calender.classList.toggle('hidden');
}

app.on('dir-processed', dir =>
  document.getElementById('current-dir-name').innerText = dir);

export default () => <>
  <nav class="mt-10">
    <ul class="w-full p-4">
      <li class="h-9">
        <a class="flex items-center text-sm cursor-pointer" onclick={toggle_popup}>
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-database" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" id="database-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><ellipse cx="12" cy="6" rx="8" ry="3"></ellipse><path d="M4 6v6a8 3 0 0 0 16 0v-6"></path><path d="M4 12v6a8 3 0 0 0 16 0v-6"></path></svg>
          </span>
          <span class="ml-2 flex-1" id="current-dir-name">[Name]</span>
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-caret-down" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path d="M6 10l6 6l6 -6h-12"></path>
            </svg>
          </span>
        </a>
        <ul class="hidden z-20 absolute left-4 right-4 mt-2 bg-white rounded-md shadow-lg" ref={e => menu = e}>
          <li class="h-9 text-sm opacity-70 px-4 pt-2 pb-0 text-gray-500">
            <div>Switch to:</div>
          </li>
          {/* <li class="h-8 text-sm opacity-70 px-4">
            <a>
              <span>[name]</span>
            </a>
          </li> */}
          <hr class="h-1 py-1" />
          <li class="h-8 text-sm opacity-70 px-4">
            <a>
              <span>Open Folder ...</span>
            </a>
          </li>
          <li class="h-8 text-sm opacity-70 px-4">
            <a>
              <span>All Folders</span>
            </a>
          </li>
        </ul>
      </li>
      <li class="h-9">
        <a class="flex items-center text-sm" href="#journals">
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-calendar" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="5" width="16" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="4" y1="11" x2="20" y2="11"></line><line x1="11" y1="15" x2="12" y2="15"></line><line x1="12" y1="15" x2="12" y2="18"></line>
            </svg>
          </span>
          <span class="ml-2 flex-1">Journals</span>
          <span class="" onclick={toggle_calendar}>
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-caret-down" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path d="M6 10l6 6l6 -6h-12"></path>
            </svg>
          </span>
        </a>
      </li>
      <Calender />
      <li class="h-9 mt-3">
        <a class="flex items-center text-sm" href="#pages">
          <span class="">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-files" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M15 3v4a1 1 0 0 0 1 1h4"></path><path d="M18 17h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h4l5 5v7a2 2 0 0 1 -2 2z"></path><path d="M16 17v2a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h2"></path>
            </svg>
          </span>
          <span class="ml-2 flex-1">All pages</span>
          <span class="">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-caret-down" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path d="M6 10l6 6l6 -6h-12"></path>
            </svg>
          </span>
        </a>
      </li>
    </ul>
  </nav>
</>