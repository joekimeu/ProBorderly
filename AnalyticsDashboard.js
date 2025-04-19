import React, { useEffect, useState } from 'react';

function AnalyticsDashboard() {
  const [transactions, setTransactions] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [interactions, setInteractions] = useState(null);

  useEffect(() => {
    fetch('/api/analytics/transactions')
      .then(res => res.json())
      .then(data => setTransactions(data))
      .catch(() => setTransactions(null));

    fetch('/api/analytics/compliance')
      .then(res => res.json())
      .then(data => setCompliance(data))
      .catch(() => setCompliance(null));

    fetch('/api/analytics/interactions')
      .then(res => res.json())
      .then(data => setInteractions(data))
      .catch(() => setInteractions(null));
  }, []);

  return (
    <div>
      <h2>Analytics Dashboard</h2>
      <section>
        <h3>Transaction Status</h3>
        {transactions ? (
          <ul>
            <li>Total Transactions: {transactions.totalTransactions}</li>
            <li>Pending: {transactions.pending}</li>
            <li>Completed: {transactions.completed}</li>
            <li>Disputed: {transactions.disputed}</li>
          </ul>
        ) : (
          <p>Loading transaction data...</p>
        )}
      </section>
      <section>
        <h3>Compliance Metrics</h3>
        {compliance ? (
          <ul>
            <li>Jurisdictions Covered: {compliance.jurisdictionsCovered}</li>
            <li>Regulations Updated: {compliance.regulationsUpdated}</li>
            <li>Active Users: {compliance.activeUsers}</li>
          </ul>
        ) : (
          <p>Loading compliance data...</p>
        )}
      </section>
      <section>
        <h3>User Interactions</h3>
        {interactions ? (
          <ul>
            <li>Daily Active Users: {interactions.dailyActiveUsers}</li>
            <li>New Registrations: {interactions.newRegistrations}</li>
            <li>Support Tickets: {interactions.supportTickets}</li>
          </ul>
        ) : (
          <p>Loading user interaction data...</p>
        )}
      </section>
    </div>
  );
}

export default AnalyticsDashboard;
