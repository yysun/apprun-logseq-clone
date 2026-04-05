/**
 * Page component using the React Outliner
 * Replaces the old Editor + Page view combination
 */
import { app, Component } from 'apprun';
import sanitize from 'sanitize-filename';
import { find_page, add_page, find_block, data } from '../model';
import OutlinerAdapter from './components/outliner-adapter';
import { pageToOutlinerPage, applyOutlinerChanges } from './utils/outliner-adapter';
import type { OutlinerPage } from 'outliner';
import Log from '../logger';

export default class extends Component {
  state = {
    name: '',
    undoStack: [],
    redoStack: [],
  };

  view = (state) => {
    const { name } = state;
    const page = find_page(name);
    if (!page) {
      return <div class="main-page px-3">Page not found</div>;
    }

    const block = find_block(page.id);
    const outlinerPage = pageToOutlinerPage(name);

    if (!outlinerPage) {
      return <div class="main-page px-3">Unable to load page</div>;
    }

    const handlePagesChange = (pages: OutlinerPage[]) => {
      Log.info('Pages changed in outliner', pages);

      // Save current state to undo stack
      const currentState = JSON.stringify(data);
      state.undoStack.push(currentState);
      state.redoStack = []; // Clear redo stack on new change

      // Apply changes
      applyOutlinerChanges(pages, data);

      // Trigger save
      app.run('@save-file', name);

      // Trigger re-render
      app.run('//refresh', name);
    };

    const handleUndo = () => {
      if (state.undoStack.length === 0) return;

      const previousState = state.undoStack.pop();
      state.redoStack.push(JSON.stringify(data));

      Object.assign(data, JSON.parse(previousState));
      app.run('//refresh', name);
    };

    const handleRedo = () => {
      if (state.redoStack.length === 0) return;

      const nextState = state.redoStack.pop();
      state.undoStack.push(JSON.stringify(data));

      Object.assign(data, JSON.parse(nextState));
      app.run('//refresh', name);
    };

    return <div class="main-page px-3">
      <div contenteditable="true" $onkeydown={'change_page_name'} $onfocusout={'change_page_name'}>
        <h1 class="py-4">{block.content}</h1>
      </div>
      <OutlinerAdapter
        pages={[outlinerPage]}
        onPagesChange={handlePagesChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={state.undoStack.length > 0}
        canRedo={state.redoStack.length > 0}
      />
    </div>;
  }

  update = {
    '/page': (state, path, name) => {
      name = sanitize(decodeURI(name));
      app.run('@search', name);
      name = path + '/' + name;
      const page = find_page(name);
      if (!page) {
        Log.info('Creating a new page: ' + name);
        add_page(name, '- ', Date.now()).name;
      }
      return { ...state, name };
    },

    'change_page_name': (state, e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log(e.target.innerText);
      }
      return state;
    },

    '//refresh': (state, name) => {
      // Force re-render
      return { ...state, name };
    }
  }
}
