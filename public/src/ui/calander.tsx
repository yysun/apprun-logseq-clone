import { app, Component } from 'apprun';
import { data } from '../store';

const get_day_class = date => {
  return data.blocks.some(b => b.page === date) ? ' has-page' : '';
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default class extends Component {
  state = new Date();

  view = state => {
    const date = state
    date.setDate(1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const prevLastDay = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    const lastDayIndex = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDay();
    const firstDayIndex = date.getDay();
    const nextDays = 7 - lastDayIndex - 1;
    const days = [];
    for (let x = firstDayIndex; x > 0; x--) {
      days.push(prevLastDay - x + 1);
    }
    for (let i = 1; i <= lastDay; i++) {
      days.push(i);
    }
    for (let j = 1; j <= nextDays; j++) {
      days.push(j);
    }

    const get_class = idx => {
      const _date = new Date(date.getFullYear(), date.getMonth(), 1);
      _date.setDate(idx - firstDayIndex + 1);
      const page_date = `${_date.getFullYear()}_${_date.getMonth() + 1}_${_date.getDate()}`;
      const today = new Date();
      let cls = 'day';
      if (idx < firstDayIndex) cls += ' prev-month';
      else if (idx > firstDayIndex + lastDay) cls += ' next-month';
      else if (idx === firstDayIndex + today.getDate() - 1 &&
        state.getMonth() === today.getMonth() &&
        state.getFullYear() === today.getFullYear()) cls += ' today';
      cls += get_day_class(page_date);
      return cls;
    };

    return <div class="calendar">
      <div class="w-full p-1 flex">
        <button $onclick='-1'>&lt;&lt;</button>
        <div class="flex-1 text-center">{months[date.getMonth()]}, {date.getFullYear()}</div>
        <button $onclick='+1'>&gt;&gt;</button>
      </div>
      <ul class="w-full calendar-grid">
        {daysOfWeek.map(day => <li class="week-day">{day}</li>)}
        {days.map((day, idx) => <li class={get_class(idx)}>{day}</li>)}
      </ul>
    </div>
  }

  update = {
    '-1': state => new Date(state.getFullYear(), state.getMonth() - 1, 1),
    '+1': state => new Date(state.getFullYear(), state.getMonth() + 1, 1),
  }
}