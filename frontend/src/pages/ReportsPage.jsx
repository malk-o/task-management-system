import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { label } from '../components/StatusPanel.jsx';

// FR3 / US6 (Member C): completion rate, overdue tasks and workload per member. Managers only.
export default function ReportsPage({ userId }) {
  const [projectId, setProjectId] = useState(1);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setReport(null);
    api(`/reports/${projectId}`, userId)
      .then(setReport)
      .catch((e) => setError(e.message));
  }, [projectId, userId]);

  return (
    <section>
      <h2>Reports</h2>
      <p className="subtitle">Project health at a glance. Only managers can open a report.</p>

      <label className="task-picker">
        <span className="muted">Project id</span>
        <input
          type="number"
          min="1"
          value={projectId}
          onChange={(e) => setProjectId(Math.max(1, Number(e.target.value) || 1))}
        />
      </label>

      {error && <p className="error">{error}</p>}

      {report && (
        <>
          <div className="report-cards">
            <div className="report-card">
              <div className="report-number">{report.completionRate}%</div>
              <div className="muted">Completion rate ({report.doneTasks} of {report.totalTasks} tasks done)</div>
            </div>
            <div className="report-card">
              <div className="report-number">{report.overdueTasks.length}</div>
              <div className="muted">Overdue tasks</div>
            </div>
          </div>

          <h3>Overdue tasks</h3>
          {report.overdueTasks.length === 0 ? (
            <p className="muted">Nothing is overdue.</p>
          ) : (
            <table className="report-table">
              <thead><tr><th>Task</th><th>Status</th><th>Was due</th></tr></thead>
              <tbody>
                {report.overdueTasks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{label(t.status)}</td>
                    <td>{new Date(t.dueDate).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>Workload per member (open tasks)</h3>
          {report.workloadPerMember.length === 0 ? (
            <p className="muted">No open tasks are assigned.</p>
          ) : (
            <table className="report-table">
              <thead><tr><th>Member</th><th>Open tasks</th></tr></thead>
              <tbody>
                {report.workloadPerMember.map((m) => (
                  <tr key={m.userId}><td>{m.name}</td><td>{m.openTasks}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}