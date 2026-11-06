import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

const FREQUENCY_LABELS = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly' };

function describe(rule) {
  if (rule.frequency === 'WEEKLY' && rule.daysOfWeek) {
    const names = rule.daysOfWeek.map((d) => DAYS.find((day) => day.value === d)?.label).join(', ');
    return `Weekly on ${names}`;
  }
  if (rule.frequency === 'MONTHLY' && rule.dayOfMonth) {
    return `Monthly on day ${rule.dayOfMonth}`;
  }
  return FREQUENCY_LABELS[rule.frequency] || rule.frequency;
}

// FR1 (Member A): create a recurring rule for a task, and list the existing rules.
export default function RecurringRulesPage({ userId }) {
  const [tasks, setTasks] = useState([]);
  const [rules, setRules] = useState([]);
  const [templateTaskId, setTemplateTaskId] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [taskList, ruleList] = await Promise.all([
        api('/tasks', userId),
        api('/recurrence-rules', userId),
      ]);
      setTasks(taskList);
      setRules(ruleList);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const titleOf = (id) => tasks.find((t) => t.id === id)?.title ?? `Task #${id}`;

  function toggleDay(value) {
    setDaysOfWeek((current) => (
      current.includes(value) ? current.filter((d) => d !== value) : [...current, value].sort()
    ));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    if (!templateTaskId) {
      setError('Choose the task to repeat');
      return;
    }
    if (frequency === 'WEEKLY' && daysOfWeek.length === 0) {
      setError('Choose at least one day of the week');
      return;
    }
    const body = {
      templateTaskId: Number(templateTaskId),
      frequency,
      daysOfWeek: frequency === 'WEEKLY' ? daysOfWeek : null,
      dayOfMonth: frequency === 'MONTHLY' ? Number(dayOfMonth) : null,
      endDate: endDate || null,
    };
    try {
      await api('/recurrence-rules', userId, { method: 'POST', body: JSON.stringify(body) });
      setMessage('Recurring rule created');
      setError('');
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h2>Recurring Tasks</h2>
      <p className="subtitle">Repeat a task automatically, so routine work is created without re-entering it.</p>

      {error && <p className="error">{error}</p>}
      {message && <p className="muted">{message}</p>}

      <form onSubmit={submit}>
        <label>
          Task to repeat
          <select value={templateTaskId} onChange={(e) => setTemplateTaskId(e.target.value)}>
            <option value="">Choose a task</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>

        <label>
          Repeats
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>

        {frequency === 'WEEKLY' && (
          <fieldset>
            <legend>On these days</legend>
            {DAYS.map((day) => (
              <label key={day.value}>
                <input
                  type="checkbox"
                  checked={daysOfWeek.includes(day.value)}
                  onChange={() => toggleDay(day.value)}
                />
                {day.label}
              </label>
            ))}
          </fieldset>
        )}

        {frequency === 'MONTHLY' && (
          <label>
            Day of the month
            <input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
            />
          </label>
        )}

        <label>
          Ends on (optional)
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>

        <button type="submit">Create rule</button>
      </form>

      <h3>Existing rules</h3>
      {rules.length === 0 && <p className="muted">No recurring rules yet.</p>}
      <ul>
        {rules.map((rule) => (
          <li key={rule.id}>
            <strong>{titleOf(rule.templateTaskId)}</strong>: {describe(rule)}
            {rule.endDate ? `, until ${rule.endDate}` : ''}
          </li>
        ))}
      </ul>
    </section>
  );
}