import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AssetCollection from './components/AssetCollection';
import GraphVisualization from './components/GraphVisualization';
import AttackPathAnalysis from './components/AttackPathAnalysis';
import QueryInterface from './components/QueryInterface';
import Navbar from './components/Navbar';

function App() {
  return (
    <div className="App">
      <Navbar />
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-2 p-0">
            <Sidebar />
          </div>
          <div className="col-md-10 main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<AssetCollection />} />
              <Route path="/graph" element={<GraphVisualization />} />
              <Route path="/attack-path" element={<AttackPathAnalysis />} />
              <Route path="/query" element={<QueryInterface />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;