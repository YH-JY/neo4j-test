import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data';

const GraphVisualization = () => {
  const networkRef = useRef(null);
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [query, setQuery] = useState('MATCH (n) RETURN n LIMIT 100');
  const [queryMethod, setQueryMethod] = useState('bolt');

  useEffect(() => {
    if (networkRef.current) {
      const options = {
        nodes: {
          shape: 'dot',
          size: 16,
          font: {
            size: 14,
            color: '#333'
          },
          borderWidth: 2,
          shadow: true
        },
        edges: {
          width: 2,
          color: { inherit: 'from' },
          smooth: {
            type: 'continuous'
          },
          shadow: true
        },
        physics: {
          stabilization: false,
          barnesHut: {
            gravitationalConstant: -2000,
            springConstant: 0.001,
            springLength: 200
          }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          hideEdgesOnDrag: true
        }
      };

      const net = new Network(networkRef.current, { nodes: [], edges: [] }, options);
      setNetwork(net);

      net.on('click', function (params) {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            showNodeDetails(node);
          }
        }
      });

      fetchGraphData();
    }
  }, []);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/graph/nodes');
      
      if (response.data.success) {
        const graphData = response.data.data;
        
        const nodesDataset = new DataSet(
          graphData.nodes.map(node => ({
            id: node.id,
            label: node.label,
            color: getNodeColor(node.type),
            title: `${node.type}: ${node.label}\n${JSON.stringify(node.properties, null, 2)}`
          }))
        );
        
        const edgesDataset = new DataSet(
          graphData.edges.map(edge => ({
            id: edge.id,
            from: edge.from,
            to: edge.to,
            label: edge.label,
            arrows: 'to'
          }))
        );
        
        setNodes(graphData.nodes);
        setEdges(graphData.edges);
        
        if (network) {
          network.setData({ nodes: nodesDataset, edges: edgesDataset });
        }
      }
    } catch (error) {
      console.error('Error fetching graph data:', error);
      toast.error('Failed to fetch graph data');
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (type) => {
    const colors = {
      'Pod': '#4CAF50',
      'Service': '#2196F3',
      'Deployment': '#FF9800',
      'Namespace': '#9C27B0',
      'Ingress': '#F44336',
      'ServiceAccount': '#00BCD4',
      'Role': '#607D8B',
      'ClusterRole': '#795548'
    };
    return colors[type] || '#9E9E9E';
  };

  const showNodeDetails = (node) => {
    toast.info(
      <div>
        <strong>{node.type}</strong><br />
        <strong>Name:</strong> {node.label}<br />
        <pre style={{ fontSize: '12px', marginTop: '10px' }}>
          {JSON.stringify(node.properties, null, 2)}
        </pre>
      </div>,
      {
        autoClose: 10000,
        closeButton: true
      }
    );
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a Cypher query');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`/api/graph/query/${queryMethod}`, {
        cypher: query
      });

      if (response.data.success) {
        const graphData = response.data.data;
        
        // Convert neo4j results to vis.js format
        const visNodes = new DataSet();
        const visEdges = new DataSet();

        if (graphData.nodes) {
          graphData.nodes.forEach((node, index) => {
            visNodes.add({
              id: node.identity.low || index,
              label: node.properties.name || `${node.labels[0]}-${index}`,
              color: getNodeColor(node.labels[0]),
              title: `${node.labels.join(', ')}: ${node.properties.name || index}`
            });
          });
        }

        if (graphData.relationships) {
          graphData.relationships.forEach((rel, index) => {
            visEdges.add({
              id: rel.identity.low || index,
              from: rel.start.low,
              to: rel.end.low,
              label: rel.type,
              arrows: 'to'
            });
          });
        }

        network.setData({ nodes: visNodes, edges: visEdges });
        toast.success('Query executed successfully');
      }
    } catch (error) {
      console.error('Error executing query:', error);
      toast.error('Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  const filterByType = (type) => {
    const filteredNodes = nodes.filter(node => node.type === type);
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(edge => 
      nodeIds.has(edge.from) || nodeIds.has(edge.to)
    );

    const nodesDataset = new DataSet(
      filteredNodes.map(node => ({
        id: node.id,
        label: node.label,
        color: getNodeColor(node.type),
        title: `${node.type}: ${node.label}`
      }))
    );

    const edgesDataset = new DataSet(
      filteredEdges.map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        arrows: 'to'
      }))
    );

    network.setData({ nodes: nodesDataset, edges: edgesDataset });
  };

  const resetView = () => {
    fetchGraphData();
  };

  return (
    <div>
      <h2>Graph Visualization</h2>
      
      <div className="row mb-3">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Query Controls</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-8">
                  <textarea
                    className="form-control query-editor"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter Cypher query..."
                    rows="3"
                  />
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">Query Method</label>
                    <select 
                      className="form-select"
                      value={queryMethod}
                      onChange={(e) => setQueryMethod(e.target.value)}
                    >
                      <option value="bolt">Bolt Protocol</option>
                      <option value="rest">REST API</option>
                    </select>
                  </div>
                  <div className="btn-group w-100">
                    <button 
                      className="btn btn-primary"
                      onClick={executeQuery}
                      disabled={loading}
                    >
                      <i className="fas fa-search me-2"></i>
                      Execute Query
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={resetView}
                    >
                      <i className="fas fa-undo me-2"></i>
                      Reset View
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <label className="form-label">Quick Filters:</label>
                <div className="btn-group">
                  <button className="btn btn-outline-primary btn-sm" onClick={() => filterByType('Pod')}>
                    Pods Only
                  </button>
                  <button className="btn btn-outline-info btn-sm" onClick={() => filterByType('Service')}>
                    Services Only
                  </button>
                  <button className="btn btn-outline-warning btn-sm" onClick={() => filterByType('Deployment')}>
                    Deployments Only
                  </button>
                  <button className="btn btn-outline-success btn-sm" onClick={() => filterByType('Namespace')}>
                    Namespaces Only
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Graph View</h5>
              <div className="d-flex align-items-center">
                <span className="me-3">
                  Nodes: {nodes.length} | Edges: {edges.length}
                </span>
                {loading && (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              <div 
                ref={networkRef} 
                style={{ height: '600px', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;