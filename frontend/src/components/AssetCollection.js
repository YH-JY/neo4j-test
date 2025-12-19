import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';

const AssetCollection = () => {
  const [assets, setAssets] = useState(null);
  const [relationships, setRelationships] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState({ rest: false, bolt: false });
  const [selectedNamespace, setSelectedNamespace] = useState('');

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const [assetsResponse, relationshipsResponse] = await Promise.all([
        axios.get('/api/k8s/assets'),
        axios.get('/api/k8s/relationships')
      ]);

      if (assetsResponse.data.success && relationshipsResponse.data.success) {
        setAssets(assetsResponse.data.data);
        setRelationships(relationshipsResponse.data.data);
        toast.success('Successfully collected K8s assets');
      }
    } catch (error) {
      console.error('Error collecting assets:', error);
      toast.error('Failed to collect K8s assets');
    } finally {
      setLoading(false);
    }
  };

  const importToNeo4j = async (method) => {
    try {
      setImporting({ ...importing, [method]: true });
      
      const response = await axios.post(`/api/neo4j/import/${method}`, null, {
        params: { namespace: selectedNamespace || undefined }
      });

      if (response.data.success) {
        toast.success(`Successfully imported assets using ${method.toUpperCase()}`);
      }
    } catch (error) {
      console.error(`Error importing via ${method}:`, error);
      toast.error(`Failed to import assets using ${method.toUpperCase()}`);
    } finally {
      setImporting({ ...importing, [method]: false });
    }
  };

  const clearGraph = async (method) => {
    if (!window.confirm(`Are you sure you want to clear the graph using ${method.toUpperCase()}?`)) {
      return;
    }

    try {
      const response = await axios.delete(`/api/neo4j/clear/${method}`);
      
      if (response.data.success) {
        toast.success(`Graph cleared using ${method.toUpperCase()}`);
      }
    } catch (error) {
      console.error(`Error clearing graph via ${method}:`, error);
      toast.error(`Failed to clear graph using ${method.toUpperCase()}`);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const AssetTable = ({ title, data, type }) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="mb-4">
        <h4>{title} ({data.length})</h4>
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                {type === 'pods' && <th>Name</th>}
                {type === 'pods' && <th>Namespace</th>}
                {type === 'pods' && <th>Status</th>}
                {type === 'pods' && <th>Node</th>}
                {type === 'services' && <th>Name</th>}
                {type === 'services' && <th>Namespace</th>}
                {type === 'services' && <th>Type</th>}
                {type === 'services' && <th>Cluster IP</th>}
                {type === 'deployments' && <th>Name</th>}
                {type === 'deployments' && <th>Namespace</th>}
                {type === 'deployments' && <th>Replicas</th>}
                {type === 'deployments' && <th>Ready</th>}
                {type === 'namespaces' && <th>Name</th>}
                {type === 'namespaces' && <th>Status</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index}>
                  {type === 'pods' && <td>{item.name}</td>}
                  {type === 'pods' && <td>{item.namespace}</td>}
                  {type === 'pods' && <td>
                    <span className={`badge bg-${item.status === 'Running' ? 'success' : 'warning'}`}>
                      {item.status}
                    </span>
                  </td>}
                  {type === 'pods' && <td>{item.nodeName}</td>}
                  
                  {type === 'services' && <td>{item.name}</td>}
                  {type === 'services' && <td>{item.namespace}</td>}
                  {type === 'services' && <td>{item.type}</td>}
                  {type === 'services' && <td>{item.clusterIP}</td>}
                  
                  {type === 'deployments' && <td>{item.name}</td>}
                  {type === 'deployments' && <td>{item.namespace}</td>}
                  {type === 'deployments' && <td>{item.replicas}</td>}
                  {type === 'deployments' && <td>{item.readyReplicas}/{item.replicas}</td>}
                  
                  {type === 'namespaces' && <td>{item.name}</td>}
                  {type === 'namespaces' && <td>{item.status}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <ClipLoader size={50} color="#007bff" />
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Asset Collection</h2>
        <div>
          <button className="btn btn-primary me-2" onClick={fetchAssets}>
            <i className="fas fa-sync-alt me-2"></i>
            Refresh Assets
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">Import to Neo4j</h5>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label">Namespace (optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Leave empty for all namespaces"
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
              />
            </div>
          </div>
          
          <div className="btn-group">
            <button
              className="btn btn-success"
              onClick={() => importToNeo4j('rest')}
              disabled={importing.rest}
            >
              {importing.rest ? (
                <>
                  <ClipLoader size={20} color="#fff" className="me-2" />
                  Importing via REST...
                </>
              ) : (
                <>
                  <i className="fas fa-download me-2"></i>
                  Import via REST API
                </>
              )}
            </button>
            
            <button
              className="btn btn-info"
              onClick={() => importToNeo4j('bolt')}
              disabled={importing.bolt}
            >
              {importing.bolt ? (
                <>
                  <ClipLoader size={20} color="#fff" className="me-2" />
                  Importing via Bolt...
                </>
              ) : (
                <>
                  <i className="fas fa-bolt me-2"></i>
                  Import via Bolt Protocol
                </>
              )}
            </button>
            
            <button
              className="btn btn-danger"
              onClick={() => clearGraph('rest')}
            >
              <i className="fas fa-trash me-2"></i>
              Clear Graph (REST)
            </button>
            
            <button
              className="btn btn-warning"
              onClick={() => clearGraph('bolt')}
            >
              <i className="fas fa-trash me-2"></i>
              Clear Graph (Bolt)
            </button>
          </div>
        </div>
      </div>

      {assets && (
        <div>
          <div className="row mb-3">
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">Namespaces</h5>
                  <h3 className="text-primary">{assets.namespaces.length}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">Pods</h5>
                  <h3 className="text-success">{assets.pods.length}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">Services</h5>
                  <h3 className="text-info">{assets.services.length}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">Deployments</h5>
                  <h3 className="text-warning">{assets.deployments.length}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Collected Assets</h5>
            </div>
            <div className="card-body">
              <AssetTable title="Namespaces" data={assets.namespaces} type="namespaces" />
              <AssetTable title="Pods" data={assets.pods} type="pods" />
              <AssetTable title="Services" data={assets.services} type="services" />
              <AssetTable title="Deployments" data={assets.deployments} type="deployments" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetCollection;