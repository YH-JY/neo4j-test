import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data';

const AttackPathAnalysis = () => {
  const networkRef = useRef(null);
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startNode, setStartNode] = useState('');
  const [endNode, setEndNode] = useState('');
  const [availableNodes, setAvailableNodes] = useState([]);
  const [attackPaths, setAttackPaths] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [analysisMethod, setAnalysisMethod] = useState('bolt');

  useEffect(() => {
    if (networkRef.current) {
      const options = {
        nodes: {
          shape: 'dot',
          size: 20,
          font: {
            size: 14,
            color: '#fff',
            bold: true
          },
          borderWidth: 3
        },
        edges: {
          width: 3,
          arrows: 'to',
          smooth: {
            type: 'continuous'
          }
        },
        physics: {
          stabilization: true,
          barnesHut: {
            gravitationalConstant: -5000,
            springConstant: 0.001,
            springLength: 100
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

      fetchAvailableNodes();
      analyzeVulnerabilities();
    }
  }, []);

  const fetchAvailableNodes = async () => {
    try {
      const response = await axios.get('/api/graph/nodes');
      if (response.data.success) {
        setAvailableNodes(response.data.data.nodes);
      }
    } catch (error) {
      console.error('Error fetching nodes:', error);
      toast.error('Failed to fetch nodes');
    }
  };

  const analyzeAttackPath = async () => {
    if (!startNode || !endNode) {
      toast.error('Please select both start and end nodes');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`/api/graph/attack-paths/${analysisMethod}`, {
        startNode: startNode,
        endNode: endNode
      });

      if (response.data.success) {
        const paths = response.data.data;
        setAttackPaths(paths);
        
        if (paths.length > 0) {
          visualizeAttackPath(paths[0]);
          toast.success(`Found ${paths.length} attack path(s)`);
        } else {
          toast.warn('No attack paths found between selected nodes');
        }
      }
    } catch (error) {
      console.error('Error analyzing attack path:', error);
      toast.error('Failed to analyze attack path');
    } finally {
      setLoading(false);
    }
  };

  const visualizeAttackPath = (path) => {
    if (!network) return;

    const nodes = new DataSet();
    const edges = new DataSet();

    let nodeIndex = 0;
    const nodeIdMap = {};

    path.segments.forEach(segment => {
      const startId = segment.start.identity.low;
      const endId = segment.end.identity.low;
      const relId = segment.relationship.identity.low;

      if (!nodeIdMap[startId]) {
        nodeIdMap[startId] = nodeIndex++;
        const labels = segment.start.labels;
        const props = segment.start.properties;
        
        nodes.add({
          id: startId,
          label: props.name || labels[0],
          color: getAttackPathNodeColor(labels[0]),
          title: `${labels.join(', ')}: ${props.name || 'Unknown'}\n${JSON.stringify(props, null, 2)}`,
          borderWidth: 3,
          borderColor: '#ff0000'
        });
      }

      if (!nodeIdMap[endId]) {
        nodeIdMap[endId] = nodeIndex++;
        const labels = segment.end.labels;
        const props = segment.end.properties;
        
        nodes.add({
          id: endId,
          label: props.name || labels[0],
          color: getAttackPathNodeColor(labels[0]),
          title: `${labels.join(', ')}: ${props.name || 'Unknown'}\n${JSON.stringify(props, null, 2)}`,
          borderWidth: 3,
          borderColor: '#ff0000'
        });
      }

      edges.add({
        id: relId,
        from: startId,
        to: endId,
        label: segment.relationship.type,
        color: { color: '#ff0000' },
        width: 3,
        arrows: 'to'
      });
    });

    network.setData({ nodes, edges });
    network.fit();
  };

  const getAttackPathNodeColor = (type) => {
    const colors = {
      'Pod': '#ff6b6b',
      'Service': '#ff9f43',
      'Deployment': '#feca57',
      'Namespace': '#ff6348',
      'Ingress': '#ff4757',
      'ServiceAccount': '#ff6b9d',
      'Role': '#ee5a6f',
      'ClusterRole': '#c44569'
    };
    return colors[type] || '#ff7675';
  };

  const analyzeVulnerabilities = async () => {
    try {
      const response = await axios.get(`/api/graph/vulnerabilities/${analysisMethod}`);
      if (response.data.success) {
        setVulnerabilities(response.data.data);
      }
    } catch (error) {
      console.error('Error analyzing vulnerabilities:', error);
    }
  };

  const generateReport = () => {
    const report = `
Attack Path Analysis Report
============================
Generated: ${new Date().toLocaleString()}
Analysis Method: ${analysisMethod.toUpperCase()}

Attack Paths Found: ${attackPaths.length}
Vulnerability Issues: ${vulnerabilities.length}

Details:
${attackPaths.length > 0 ? 
  attackPaths.map((path, index) => 
    `Path ${index + 1}: ${path.segments.length} hops`
  ).join('\n') : 'No attack paths found'
}

Recommendations:
1. Review default service account usage
2. Implement network policies
3. Regularly audit RBAC permissions
4. Monitor inter-service communications
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attack-path-report-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Report generated and downloaded');
  };

  return (
    <div>
      <h2>Attack Path Analysis</h2>
      
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Attack Path Analysis</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Analysis Method</label>
                <select 
                  className="form-select"
                  value={analysisMethod}
                  onChange={(e) => setAnalysisMethod(e.target.value)}
                >
                  <option value="bolt">Bolt Protocol</option>
                  <option value="rest">REST API</option>
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Start Node</label>
                <select 
                  className="form-select"
                  value={startNode}
                  onChange={(e) => setStartNode(e.target.value)}
                >
                  <option value="">Select start node...</option>
                  {availableNodes.map(node => (
                    <option key={node.id} value={node.label}>
                      {node.type} - {node.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label">End Node</label>
                <select 
                  className="form-select"
                  value={endNode}
                  onChange={(e) => setEndNode(e.target.value)}
                >
                  <option value="">Select end node...</option>
                  {availableNodes.map(node => (
                    <option key={node.id} value={node.label}>
                      {node.type} - {node.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="btn-group w-100">
                <button 
                  className="btn btn-danger"
                  onClick={analyzeAttackPath}
                  disabled={loading}
                >
                  <i className="fas fa-route me-2"></i>
                  Analyze Attack Path
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={generateReport}
                  disabled={attackPaths.length === 0}
                >
                  <i className="fas fa-file-download me-2"></i>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Vulnerability Analysis</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                Common vulnerability patterns detected
              </div>
              
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Pods using default service account
                  <span className="badge bg-danger rounded-pill">
                    {vulnerabilities.filter(v => v.d && v.d.properties.name === 'default').length}
                  </span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Exposed services
                  <span className="badge bg-warning rounded-pill">
                    {availableNodes.filter(n => n.type === 'Service' && 
                      n.properties && n.properties.type === 'LoadBalancer').length}
                  </span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Public ingresses
                  <span className="badge bg-warning rounded-pill">
                    {availableNodes.filter(n => n.type === 'Ingress').length}
                  </span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Total nodes analyzed
                  <span className="badge bg-primary rounded-pill">
                    {availableNodes.length}
                  </span>
                </li>
              </ul>
              
              <div className="mt-3">
                <h6>Security Recommendations</h6>
                <ul className="small">
                  <li>Create dedicated service accounts for each pod</li>
                  <li>Implement network policies to restrict traffic</li>
                  <li>Use RBAC to limit permissions</li>
                  <li>Avoid using privileged containers</li>
                  <li>Regularly update container images</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Attack Path Visualization</h5>
            </div>
            <div className="card-body p-0">
              {attackPaths.length > 0 ? (
                <div className="alert alert-success m-3">
                  <i className="fas fa-check-circle me-2"></i>
                  Found {attackPaths.length} attack path(s) between {startNode} and {endNode}
                </div>
              ) : (
                <div className="alert alert-info m-3">
                  <i className="fas fa-info-circle me-2"></i>
                  Select start and end nodes to visualize potential attack paths
                </div>
              )}
              
              <div 
                ref={networkRef} 
                style={{ height: '500px', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackPathAnalysis;