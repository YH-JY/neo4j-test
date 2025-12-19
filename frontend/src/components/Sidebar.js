import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="sidebar">
      <nav className="nav flex-column">
        <Link to="/" className={`nav-link ${isActive('/')}`}>
          <i className="fas fa-tachometer-alt me-2"></i>
          Dashboard
        </Link>
        <Link to="/assets" className={`nav-link ${isActive('/assets')}`}>
          <i className="fas fa-database me-2"></i>
          Asset Collection
        </Link>
        <Link to="/graph" className={`nav-link ${isActive('/graph')}`}>
          <i className="fas fa-project-diagram me-2"></i>
          Graph Visualization
        </Link>
        <Link to="/attack-path" className={`nav-link ${isActive('/attack-path')}`}>
          <i className="fas fa-route me-2"></i>
          Attack Path Analysis
        </Link>
        <Link to="/query" className={`nav-link ${isActive('/query')}`}>
          <i className="fas fa-search me-2"></i>
          Query Interface
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;