import { app, Component, on } from 'apprun';
import { data, dirHandle, select_dir, grant_access } from '../store';
import Page from './components/page';
import { editor_keydown } from './utils/keyboard-events';

export default class extends Component {

  @on('#pages')
  show = () => data;
  state = data;

  view = ({ pages }) => {
    pages = data.pages?.filter(p => !p.name.startsWith('journals/')) || [];
    pages = pages.sort((a, b) => b.name.localeCompare(a.name));
    const total = pages.length;

    return pages.length > 0 ?
      <div class="main-page">
        <h1>All Pages ({total})</h1>
        <div class="editor" contenteditable="true" $onkeydown={editor_keydown}
          ref={e => e.focus()}>
          {pages.map(page => <Page page={page} editable />)}
        </div>
      </div> : !dirHandle ?
        <button $onclick={select_dir}>Open...</button> :
        <button $onclick={grant_access}>Grant access...</button>
  }

}