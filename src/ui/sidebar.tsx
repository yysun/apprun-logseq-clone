import app from 'apprun';

export default () => <>
  <nav class="mt-10">
    <ul class="w-full p-4">
      <li class="h-9">
        <a class="flex items-center text-sm" href="#journals">
          <span class="">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-calendar" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="5" width="16" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="4" y1="11" x2="20" y2="11"></line><line x1="11" y1="15" x2="12" y2="15"></line><line x1="12" y1="15" x2="12" y2="18"></line>
            </svg>
          </span>
          <span class="ml-2 flex-1">Journals</span>
        </a>
      </li>
      <li class="h-9">
        <a class="flex items-center text-sm" href="#pages">
          <span class="">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-files" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M15 3v4a1 1 0 0 0 1 1h4"></path><path d="M18 17h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h4l5 5v7a2 2 0 0 1 -2 2z"></path><path d="M16 17v2a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h2"></path>
            </svg>
          </span>
          <span class="ml-2 flex-1">All pages</span>
        </a>
      </li>
    </ul>
  </nav>
</>