import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      {/* Top Navigation */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>PhishGuard AI Dashboard</h1>
        </div>
        <div style={{ fontSize: '13px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '16px' }}>
          Phase 1: Project Scaffolding
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '32px auto', padding: '0 16px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['overview', 'history', 'inspector'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: activeTab === tab ? '#2563eb' : '#cbd5e1',
                backgroundColor: activeTab === tab ? '#2563eb' : '#ffffff',
                color: activeTab === tab ? '#ffffff' : '#475569',
                cursor: 'pointer',
                fontWeight: '500',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>System Status</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>Operational</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>FastAPI Backend Ready for Phase 2</p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>ML Engine</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#d97706' }}>Phase 4 Pending</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>XGBoost Classifier + SHAP Explainers</p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>Chrome Extension</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>Manifest V3 Ready</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>Pre-click & DOM Content Inspection</p>
            </div>
          </div>
        )}

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Detection History (Placeholder)</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Detection events received from the Chrome extension and backend SQLite store will appear here in Phase 7.
            </p>
          </div>
        )}

        {/* Inspector Tab Content */}
        {activeTab === 'inspector' && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Manual URL Inspector (Placeholder)</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              In Phase 7, you will be able to input any URL here to see a live breakdown of lexical features and SHAP explanations.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
