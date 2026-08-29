import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Fingerprint, Printer, CheckCircle, AlertCircle, Utensils, Clock } from 'lucide-react';
import { format } from 'date-fns';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [coupons, setCoupons] = useState([]);
  const [employeeNo, setEmployeeNo] = useState('');
  const [mealType, setMealType] = useState('Lunch');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchCoupons = async () => {
    try {
      const response = await axios.get(`${API_URL}/coupons/today`);
      setCoupons(response.data);
    } catch (error) {
      console.error('Failed to fetch coupons', error);
    }
  };

  useEffect(() => {
    fetchCoupons();
    // Poll for new coupons every 5 seconds (simulating real-time Hikvision updates)
    const interval = setInterval(fetchCoupons, 5000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleManualTrigger = async (e) => {
    e.preventDefault();
    if (!employeeNo) return;
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/coupons/trigger`, { employeeNo, mealType });
      showToast('Coupon printed successfully!');
      setEmployeeNo('');
      fetchCoupons();
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to print coupon';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>IIBS Food Coupons</h1>
        <p>Live Dashboard & Manual Override</p>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Manual Trigger */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Fingerprint className="text-accent" /> Manual Issue
          </h2>
          <form className="manual-trigger" onSubmit={handleManualTrigger}>
            <div className="input-group">
              <label>Student / Employee No.</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. STU-1001"
                value={employeeNo}
                onChange={(e) => setEmployeeNo(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <label>Meal Type</label>
              <select 
                className="input-field"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
              >
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              <Printer size={20} />
              {loading ? 'Printing...' : 'Print Coupon'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={14} color="var(--success)"/>
              Hikvision Terminal Listener Active
            </p>
          </div>
        </div>

        {/* Right Column: Today's Logs */}
        <div className="glass-panel">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock className="text-accent" /> Today's Issued Coupons
          </h2>
          
          <div className="table-container">
            {coupons.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Student/Emp No.</th>
                    <th>Name</th>
                    <th>Meal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td>{format(new Date(coupon.issuedAt), 'HH:mm')}</td>
                      <td style={{ fontWeight: 600 }}>{coupon.employeeNo}</td>
                      <td>{coupon.name || 'Unknown Student'}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Utensils size={14} /> {coupon.mealType}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge">
                          <CheckCircle size={12} /> Printed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <Printer size={48} opacity={0.5} />
                <p>No coupons issued yet today.</p>
                <p style={{ fontSize: '0.85rem' }}>Awaiting scans from Hikvision terminal...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle /> : <AlertCircle />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
