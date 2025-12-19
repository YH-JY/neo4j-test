import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';

const Dashboard = () => {
  const [stats, setStats] = useState({
    pods: 0,
    services: 0,
    deployments: 0,
    namespaces: 0,
    relationships: 0
  });
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState({
    k8s: false,
    neo4jRest: false,
    neo4jBolt: false
  });

  useEffect(() => {
    fetchGraphStats();
    checkConnections();
  }, []);

  const fetchGraphStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/graph/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching graph stats:', error);
      toast.error('Failed to fetch graph statistics');
    } finally {
      setLoading(false);
    }
  };

  const checkConnections = async () => {
    try {
      // Check K8s connection
      const k8sResponse = await axios.get('/api/k8s/health');
      
      // Check Neo4j connections
      const neo4jResponse = await axios.get('/api/neo4j/health');
      
      setConnections({
        k8s: k8sResponse.data.success,
        neo4jRest: neo4jResponse.data.connections.rest,
        neo4jBolt: neo4jResponse.data.connections.bolt
      });
    } catch (error) {
      console.error('Error checking connections:', error);
    }
  };

  const ConnectionStatus = ({ name, connected }) => (
    <div className="d-flex align-items-center mb-2">
      <div className={`me-2 ${connected ? 'text-success' : 'text-danger'}`}>
        <i className={`fas fa-circle ${connected ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
      </div>
      <span>{name}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-spinner">
        <ClipLoader size={50} color="#007bff" />
      </div>
    );
  }

  return (
    <div>
      <h2>Dashboard</h2>
      
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Connection Status</h5>
            </div>
            <div className="card-body">
              <ConnectionStatus name="Kubernetes" connected={connections.k8s} />
              <ConnectionStatus name="Neo4j REST API" connected={connections.neo4jRest} />
              <ConnectionStatus name="Neo4j Bolt" connected={connections.neo4jBolt} />
            </div>
          </div>
        </div>
        
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Graph Statistics</h5>
            </div>
            <div className="card-body">
              <div className="node-counts">
                <div className="stat-card">
                  <h3>{stats.namespaces}</h3>
                  <p>Namespaces</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.pods}</h3>
                  <p>Pods</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.services}</h3>
                  <p>Services</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.deployments}</h3>
                  <p>Deployments</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.relationships}</h3>
                  <p>Relationships</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Quick Actions</h5>
        </div>
        <div className="card-body">
          <div className="btn-group">
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/assets'}
            >
              <i className="fas fa-download me-2"></i>
              Collect Assets
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => window.location.href = '/graph'}
            >
              <i className="fas fa-eye me-2"></i>
              View Graph
            </button>
            <button 
              className="btn btn-warning"
              onClick={() => window.location.href = '/attack-path'}
            >
              <i className="fas fa-route me-2"></i>
              Analyze Attack Paths
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;