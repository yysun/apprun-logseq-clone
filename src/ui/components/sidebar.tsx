/**
 * Sidebar Navigation Component
 *
 * Features:
 * - Database selector with dropdown menu for switching workspaces
 * - Journals menu with collapsible calendar
 * - Pages menu with collapsible pages list
 *
 * Implementation notes:
 * - Journals and Pages navigation use anchor href routes for AppRun route events.
 * - Caret clicks call toggle handlers that prevent default navigation.
 *
 * Journals Calendar:
 * - Collapsed by default
 * - State persisted to localStorage (key: 'journals-collapsed')
 * - Click caret icon to toggle collapse/expand
 * - Caret rotates -90deg when collapsed, 0deg when expanded
 * - Smooth CSS transition on caret rotation
 *
 * Pages List:
 * - Collapsed by default
 * - State persisted to localStorage (key: 'pages-collapsed')
 * - Click caret icon to toggle collapse/expand
 * - Click icon or label to navigate to /pages
 * - Shows list of all pages from pages/ directory
 * - Caret rotates -90deg when collapsed, 0deg when expanded
 *
 * Recent changes:
 * - 2026-02-07: Switched Pages navigation to anchor href '/pages' in sidebar.
 * - 2026-02-01: Added Pages menu item with file-text icon
 * - 2026-02-01: Implemented collapsible Journals calendar with persistent state
 * - 2026-02-01: Implemented collapsible Pages list with persistent state
 */

import app from 'apprun';
import { select_dir } from '../../store'
import Calender from './calander';
import PagesList from './pages-list';

const JOURNALS_COLLAPSED_KEY = 'journals-collapsed';
const PAGES_COLLAPSED_KEY = 'pages-collapsed';

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
  const isHidden = calender.classList.toggle('hidden');
  // Persist state to localStorage
  localStorage.setItem(JOURNALS_COLLAPSED_KEY, isHidden ? 'true' : 'false');

  // Rotate the caret icon
  const caret = e.target.closest('span').querySelector('svg') || e.target.closest('svg');
  if (caret) {
    if (isHidden) {
      (caret as HTMLElement).style.transform = 'rotate(-90deg)';
    } else {
      (caret as HTMLElement).style.transform = 'rotate(0deg)';
    }
  }
}

const toggle_pages_list = e => {
  e.preventDefault();
  const pagesList = document.querySelector('.pages-list');
  const isHidden = pagesList.classList.toggle('hidden');
  // Persist state to localStorage
  localStorage.setItem(PAGES_COLLAPSED_KEY, isHidden ? 'true' : 'false');

  // Rotate the caret icon
  const caret = e.target.closest('span').querySelector('svg') || e.target.closest('svg');
  if (caret) {
    if (isHidden) {
      (caret as HTMLElement).style.transform = 'rotate(-90deg)';
    } else {
      (caret as HTMLElement).style.transform = 'rotate(0deg)';
    }
  }
}

// Initialize calendar state from localStorage
const initCalendarState = () => {
  const isCollapsed = localStorage.getItem(JOURNALS_COLLAPSED_KEY) !== 'false';
  const calender = document.querySelector('.calendar');
  const caret = document.querySelector('.journal-caret') as HTMLElement;

  if (calender) {
    if (isCollapsed) {
      calender.classList.add('hidden');
      if (caret) caret.style.transform = 'rotate(-90deg)';
    } else {
      calender.classList.remove('hidden');
      if (caret) caret.style.transform = 'rotate(0deg)';
    }
  }
}

// Initialize pages list state from localStorage
const initPagesListState = () => {
  const isCollapsed = localStorage.getItem(PAGES_COLLAPSED_KEY) !== 'false';
  const pagesList = document.querySelector('.pages-list');
  const caret = document.querySelector('.pages-caret') as HTMLElement;

  if (pagesList) {
    if (isCollapsed) {
      pagesList.classList.add('hidden');
      if (caret) caret.style.transform = 'rotate(-90deg)';
    } else {
      pagesList.classList.remove('hidden');
      if (caret) caret.style.transform = 'rotate(0deg)';
    }
  }
}

// Initialize on mount
setTimeout(initCalendarState, 100);
setTimeout(initPagesListState, 100);

app.on('dir-processed', dir =>
  document.getElementById('current-dir-name').innerText = dir);

const open_new_dir = async () => {
  await select_dir();
  if (location.pathname === "/journals") location.reload();
  else location.href = "/journals";
}

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
            <a onclick={open_new_dir}>
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
        <a class="flex items-center text-sm" href="/journals">
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-calendar" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="5" width="16" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="4" y1="11" x2="20" y2="11"></line><line x1="11" y1="15" x2="12" y2="15"></line><line x1="12" y1="15" x2="12" y2="18"></line>
            </svg>
          </span>
          <span class="ml-2 flex-1">Journals</span>
          <span class="" onclick={toggle_calendar}>
            <svg class="journal-caret icon icon-tabler icon-tabler-caret-down" style="transition: transform 0.2s ease;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path d="M6 10l6 6l6 -6h-12"></path>
            </svg>
          </span>
        </a>
      </li>
      <Calender />
      <li class="h-9">
        <a class="flex items-center text-sm" href="/pages">
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-file-text" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
              <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
              <line x1="9" y1="9" x2="10" y2="9"></line>
              <line x1="9" y1="13" x2="15" y2="13"></line>
              <line x1="9" y1="17" x2="15" y2="17"></line>
            </svg>
          </span>
          <span class="ml-2 flex-1">Pages</span>
          <span class="" onclick={toggle_pages_list}>
            <svg class="pages-caret icon icon-tabler icon-tabler-caret-down" style="transition: transform 0.2s ease;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path d="M6 10l6 6l6 -6h-12"></path>
            </svg>
          </span>
        </a>
      </li>
      <PagesList />
    </ul>
  </nav>
</>
