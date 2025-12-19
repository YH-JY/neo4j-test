import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';

const QueryInterface = () => {
  const [query, setQuery] = useState(`MATCH (p:Pod)-[r:RUNS_AS]->(sa:ServiceAccount)
WHERE sa.name = 'default'
RETURN p, sa LIMIT 10`);

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('bolt');
  const [history, setHistory] = useState([]);

  const predefinedQueries = [
    {
      name: 'Find pods using default service account',
      query: `MATCH (p:Pod)-[r:RUNS_AS]->(sa:ServiceAccount)
WHERE sa.name = 'default'
RETURN p.name, p.namespace, sa.name LIMIT 10`
    },
    {
      name: 'Find all services and their pods',
      query: `MATCH (s:Service)-[:SELECTS]->(p:Pod)
RETURN s.name, s.namespace, p.name, p.status LIMIT 20`
    },
    {
      name: 'Find exposed services',
      query: `MATCH (s:Service)
WHERE s.type = 'LoadBalancer' OR s.type = 'NodePort'
RETURN s.name, s.namespace, s.type, s.clusterIP`
    },
    {
      name: 'Find all pods in default namespace',
      query: `MATCH (p:Pod)
WHERE p.namespace = 'default'
RETURN p.name, p.status, p.nodeName`
    },
    {
      name: 'Count resources by type',
      query: `MATCH (n)
RETURN n.type as type, count(*) as count
ORDER BY count DESC`
    },
    {
      name: 'Find orphaned pods (no deployment)',
      query: `MATCH (p:Pod)
WHERE NOT (p)<-[:MANAGES]-(:Deployment)
RETURN p.name, p.namespace, p.status`
    },
    {
      name: 'Find ingress-to-service paths',
      query: `MATCH (i:Ingress)-[]->(s:Service)
RETURN i.name, s.name, s.namespace`
    },
    {
      name: 'Find pods with privileged containers',
      query: `MATCH (p:Pod)
WHERE p.labels.'security.openshift.io/scc' = 'anyuid'
RETURN p.name, p.namespace`
    }
  ];

  const executeQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a Cypher query');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`/api/graph/query/${method}`, {
        cypher: query
      });

      if (response.data.success) {
        setResults(response.data.data);
        
        // Add to history
        const historyItem = {
          query: query,
          method: method,
          timestamp: new Date(),
          resultCount: response.data.data.nodes?.length || 0
        };
        
        setHistory(prev => [historyItem, ...prev.slice(0, 9)]);
        toast.success(`Query executed successfully. Found ${historyItem.resultCount} results`);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      toast.error(error.response?.data?.error || 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  const formatResults = () => {
    if (!results || (!results.nodes && !results.relationships)) {
      return <div className="alert alert-info">No results to display</div>;
    }

    return (
      <div>
        {results.nodes && results.nodes.length > 0 && (
          <div className="mb-4">
            <h5>Nodes ({results.nodes.length})</h5>
            <div className="table-responsive">
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Namespace</th>
                    <th>Properties</th>
                  </tr>
                </thead>
                <tbody>
                  {results.nodes.map((node, index) => (
                    <tr key={index}>
                      <td>
                        <span className="badge bg-secondary">
                          {node.labels?.join(', ') || node.type || 'Node'}
                        </span>
                      </td>
                      <td>{node.properties?.name || '-'}</td>
                      <td>{node.properties?.namespace || '-'}</td>
                      <td>
                        <details>
                          <summary>View</summary>
                          <pre className="mt-2 small">
                            {JSON.stringify(node.properties, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results.relationships && results.relationships.length > 0 && (
          <div className="mb-4">
            <h5>Relationships ({results.relationships.length})</h5>
            <div className="table-responsive">
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    <th>Start Node</th>
                    <th>Relationship</th>
                    <th>End Node</th>
                  </tr>
                </thead>
                <tbody>
                  {results.relationships.map((rel, index) => (
                    <tr key={index}>
                      <td>{rel.start}</td>
                      <td>
                        <span className="badge bg-primary">
                          {rel.type}
                        </span>
                      </td>
                      <td>{rel.end}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const loadPresetQuery = (presetQuery) => {
    setQuery(presetQuery);
  };

  const clearResults = () => {
    setResults(null);
  };

  return (
    <div>
      <h2>Cypher Query Interface</h2>
      
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Query Editor</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Connection Method</label>
                <div className="btn-group" role="group">
                  <input 
                    type="radio" 
                    className="btn-check" 
                    name="method" 
                    id="method-bolt" 
                    value="bolt"
                    checked={method === 'bolt'}
                    onChange={(e) => setMethod(e.target.value)}
                  />
                  <label className="btn btn-outline-primary" htmlFor="method-bolt">
                    <i className="fas fa-bolt me-2"></i>
                    Bolt Protocol
                  </label>
                  
                  <input 
                    type="radio" 
                    className="btn-check" 
                    name="method" 
                    id="method-rest" 
                    value="rest"
                    checked={method === 'rest'}
                    onChange={(e) => setMethod(e.target.value)}
                  />
                  <label className="btn btn-outline-secondary" htmlFor="method-rest">
                    <i className="fas fa-globe me-2"></i>
                    REST API
                  </label>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Cypher Query</label>
                <textarea
                  className="form-control font-monospace"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={10}
                  placeholder="Enter your Cypher query here..."
                  spellCheck="false"
                />
              </div>
              
              <div className="btn-group">
                <button 
                  className="btn btn-primary"
                  onClick={executeQuery}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <ClipLoader size={20} color="#fff" className="me-2" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play me-2"></i>
                      Execute Query
                    </>
                  )}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={clearResults}
                  disabled={!results}
                >
                  <i className="fas fa-eraser me-2"></i>
                  Clear Results
                </button>
              </div>
            </div>
          </div>
          
          <div className="card mt-3">
            <div className="card-header">
              <h5 className="card-title mb-0">Predefined Queries</h5>
            </div>
            <div className="card-body">
              <div className="list-group">
                {predefinedQueries.map((preset, index) => (
                  <button
                    key={index}
                    className="list-group-item list-group-item-action"
                    onClick={() => loadPresetQuery(preset.query)}
                  >
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">{preset.name}</h6>
                      <small>
                        <i className="fas fa-code me-1"></i>
                        Load
                      </small>
                    </div>
                    <small className="text-muted">
                      {preset.query.substring(0, 100)}...
                    </small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Query History</h5>
            </div>
            <div className="card-body">
              {history.length === 0 ? (
                <p className="text-muted">No queries executed yet</p>
              ) : (
                <div className="list-group">
                  {history.map((item, index) => (
                    <div key={index} className="list-group-item">
                      <div className="d-flex w-100 justify-content-between">
                        <small className="text-muted">
                          {item.timestamp.toLocaleTimeString()}
                        </small>
                        <span className="badge bg-secondary">
                          {item.method.toUpperCase()}
                        </span>
                      </div>
                      <small className="mt-2 d-block">
                        Results: {item.resultCount}
                      </small>
                      <details>
                        <summary className="small">View Query</summary>
                        <pre className="mt-2 small">
                          {item.query}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="card mt-3">
            <div className="card-header">
              <h5 className="card-title mb-0">Cypher Cheat Sheet</h5>
            </div>
            <div className="card-body">
              <h6>Basic Patterns</h6>
              <ul className="small">
                <li><code>MATCH (n) RETURN n</code> - All nodes</li>
                <li><code>MATCH (n:Pod) RETURN n</code> - Pods only</li>
                <li><code>MATCH ()-[r]->() RETURN r</code> - All relationships</li>
              </ul>
              
              <h6>Where Conditions</h6>
              <ul className="small">
                <li><code>WHERE n.name = 'test'</code></li>
                <li><code>WHERE n.namespace = 'default'</code></li>
                <li><code>WHERE n.status = 'Running'</code></li>
              </ul>
              
              <h6>Path Queries</h6>
              <ul className="small">
                <li><code>MATCH (a)-[*]->(b)</code> - Any path</li>
                <li><code>MATCH (a)-[*1..3]->(b)</code> - 1-3 hops</li>
                <li><code>shortestPath((a)-[*]-(b))</code> - Shortest path</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {results && (
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Query Results</h5>
              </div>
              <div className="card-body">
                {formatResults()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryInterface;