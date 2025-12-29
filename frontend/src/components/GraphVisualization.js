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
  const [query, setQuery] = useState('MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 200');
  const [queryMethod, setQueryMethod] = useState('bolt');
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [viewMode, setViewMode] = useState('attack-path');

  useEffect(() => {
    if (networkRef.current) {
      const options = {
        layout: {
          hierarchical: {
            enabled: viewMode === 'attack-path',
            direction: 'UD',
            sortMethod: 'directed',
            levelSeparation: 150,
            nodeSpacing: 200,
            treeSpacing: 200
          }
        },
        nodes: {
          shape: 'box',
          size: 25,
          font: {
            size: 14,
            color: '#ffffff',
            bold: true
          },
          borderWidth: 3,
          borderWidthSelected: 4,
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.3)',
            size: 10,
            x: 0,
            y: 0
          },
          scaling: {
            min: 20,
            max: 40,
            label: {
              enabled: true,
              min: 12,
              max: 16
            }
          }
        },
        edges: {
          width: 3,
          smooth: {
            enabled: true,
            type: 'curvedCW',
            roundness: 0.2
          },
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.2)',
            size: 5,
            x: 0,
            y: 0
          },
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 1.2,
              type: 'arrow'
            }
          },
          font: {
            size: 12,
            color: '#333333',
            strokeWidth: 3,
            strokeColor: 'rgba(255,255,255,0.8)'
          }
        },
        physics: {
          enabled: viewMode !== 'attack-path',
          stabilization: {
            enabled: true,
            iterations: 200
          },
          barnesHut: {
            gravitationalConstant: -3000,
            springConstant: 0.04,
            springLength: 150,
            damping: 0.09
          }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          hideEdgesOnDrag: false,
          zoomView: true,
          dragView: true,
          navigationButtons: true,
          keyboard: true
        },
        groups: {
          critical: {
            color: {
              background: '#dc3545',
              border: '#bd2130',
              highlight: {
                background: '#c82333',
                border: '#a71e2a'
              }
            }
          },
          high: {
            color: {
              background: '#fd7e14',
              border: '#e85d04',
              highlight: {
                background: '#dc6502',
                border: '#c15701'
              }
            }
          },
          medium: {
            color: {
              background: '#ffc107',
              border: '#d39e00',
              highlight: {
                background: '#e0a800',
                border: '#b19000'
              }
            }
          },
          low: {
            color: {
              background: '#28a745',
              border: '#1e7e34',
              highlight: {
                background: '#218838',
                border: '#1c6e2c'
              }
            }
          }
        }
      };

      const net = new Network(networkRef.current, { nodes: [], edges: [] }, options);
      setNetwork(net);

      net.on('click', function (params) {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            setSelectedNode(node);
            setSelectedEdge(null);
            highlightAttackPath(nodeId);
          }
        } else if (params.edges.length > 0) {
          const edgeId = params.edges[0];
          const edge = edges.find(e => e.id === edgeId);
          if (edge) {
            setSelectedEdge(edge);
            setSelectedNode(null);
          }
        }
      });

      net.on('oncontext', function (params) {
        params.event.preventDefault();
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          showNodeContextMenu(nodeId, params.pointer.DOM);
        }
      });

      fetchGraphData();
    }
  }, [viewMode]);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/graph/nodes');
      
      if (response.data.success) {
        const graphData = response.data.data;
        
        const nodesDataset = new DataSet(
          graphData.nodes.map(node => ({
            id: parseInt(node.id),
            label: node.label,
            color: getNodeColor(node.type),
            title: `${node.type}: ${node.label}\n${JSON.stringify(node.properties, null, 2)}`,
            properties: node.properties,
            labels: [node.type]
          }))
        );
        
        const edgesDataset = new DataSet(
          graphData.edges.map(edge => ({
            id: parseInt(edge.id),
            from: parseInt(edge.from),
            to: parseInt(edge.to),
            label: edge.label,
            arrows: 'to'
          }))
        );
        
        setNodes(graphData.nodes.map(node => ({
          ...node,
          id: parseInt(node.id),
          labels: [node.type]
        })));
        setEdges(graphData.edges.map(edge => ({
          ...edge,
          id: parseInt(edge.id),
          from: parseInt(edge.from),
          to: parseInt(edge.to)
        })));
        
        if (network) {
          network.setData({ nodes: nodesDataset, edges: edgesDataset });
        }
      }
    } catch (error) {
      console.error('Error fetching graph data:', error);
      toast.error('获取图谱数据失败，请检查后端服务是否正常运行');
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (type) => {
    const attackColors = {
      'Pod': {
        background: '#e74c3c',
        border: '#c0392b',
        highlight: {
          background: '#c0392b',
          border: '#a93226'
        }
      },
      'Service': {
        background: '#3498db',
        border: '#2980b9',
        highlight: {
          background: '#2980b9',
          border: '#21618c'
        }
      },
      'Deployment': {
        background: '#f39c12',
        border: '#d68910',
        highlight: {
          background: '#d68910',
          border: '#b1760f'
        }
      },
      'Namespace': {
        background: '#9b59b6',
        border: '#8e44ad',
        highlight: {
          background: '#8e44ad',
          border: '#7d3c98'
        }
      },
      'Ingress': {
        background: '#e67e22',
        border: '#d35400',
        highlight: {
          background: '#d35400',
          border: '#ba4a00'
        }
      },
      'ServiceAccount': {
        background: '#1abc9c',
        border: '#16a085',
        highlight: {
          background: '#16a085',
          border: '#138d75'
        }
      },
      'Role': {
        background: '#34495e',
        border: '#2c3e50',
        highlight: {
          background: '#2c3e50',
          border: '#1b2631'
        }
      },
      'ClusterRole': {
        background: '#7f8c8d',
        border: '#707b7c',
        highlight: {
          background: '#707b7c',
          border: '#5d6d7e'
        }
      }
    };
    return attackColors[type] || attackColors['Pod'];
  };

  const getRiskLevel = (type, properties) => {
    if (type === 'Ingress' || type === 'ServiceAccount') return 'critical';
    if (type === 'Pod' || type === 'Deployment') return 'high';
    if (type === 'Service' || type === 'Role') return 'medium';
    return 'low';
  };

  const highlightAttackPath = (nodeId) => {
    if (!network) return;
    
    const connectedNodes = new Set([nodeId]);
    const connectedEdges = new Set();
    
    edges.forEach(edge => {
      const fromId = edge.from?.low || edge.from;
      const toId = edge.to?.low || edge.to;
      if (fromId === nodeId || toId === nodeId) {
        connectedEdges.add(edge.id || edge.identity?.low);
        connectedNodes.add(fromId);
        connectedNodes.add(toId);
      }
    });

    const nodeUpdates = nodes.map(node => ({
      id: node.id,
      opacity: connectedNodes.has(node.id) ? 1 : 0.3,
      borderWidth: node.id === nodeId ? 5 : (connectedNodes.has(node.id) ? 3 : 1)
    }));

    const edgeUpdates = edges.map(edge => {
      const edgeId = edge.id || edge.identity?.low;
      return {
        id: edgeId,
        opacity: connectedEdges.has(edgeId) ? 1 : 0.1,
        width: connectedEdges.has(edgeId) ? 4 : 1
      };
    });

    if (network.body && network.body.data) {
      network.body.data.nodes.update(nodeUpdates);
      network.body.data.edges.update(edgeUpdates);
    }
  };

  const showNodeContextMenu = (nodeId, position) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      toast.error('节点不存在');
      return;
    }

    toast.info(
      <div style={{ minWidth: '250px' }}>
        <h6 className="fw-bold">节点操作</h6>
        <div className="d-grid gap-2">
          <button className="btn btn-sm btn-outline-primary" onClick={() => highlightAttackPath(nodeId)}>
            <i className="fas fa-route me-2"></i>显示攻击路径
          </button>
          <button className="btn btn-sm btn-outline-info" onClick={() => showNodeDetails(node)}>
            <i className="fas fa-info-circle me-2"></i>详细信息
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => isolateNode(nodeId)}>
            <i className="fas fa-exclamation-triangle me-2"></i>隔离节点
          </button>
        </div>
      </div>,
      {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true
      }
    );
  };

  const isolateNode = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      toast.error('节点不存在');
      return;
    }

    const isolatedEdges = edges.filter(edge => {
      const fromId = edge.from?.low || edge.from;
      const toId = edge.to?.low || edge.to;
      return fromId === nodeId || toId === nodeId;
    });
    
    const nodesDataset = new DataSet([
      {
        id: nodeId,
        label: node.properties ? node.properties.name : node.label || `Unknown-${nodeId}`,
        color: getNodeColor(node.labels ? node.labels[0] : node.type),
        title: `${node.labels ? node.labels[0] : node.type}: ${node.properties ? node.properties.name : node.label || `Unknown-${nodeId}`} (已隔离)`,
        properties: node.properties,
        labels: node.labels
      }
    ]);

    const edgesDataset = new DataSet(
      isolatedEdges.map(edge => {
        const edgeId = edge.id || edge.identity?.low;
        return {
          id: edgeId,
          from: edge.from?.low || edge.from,
          to: edge.to?.low || edge.to,
          label: edge.type || edge.label,
          arrows: 'to',
          color: { color: '#dc3545', highlight: '#c82333' }
        };
      })
    );

    if (network) {
      network.setData({ nodes: nodesDataset, edges: edgesDataset });
    }
    toast.success(`节点 ${node.properties ? node.properties.name : node.label || nodeId} 已隔离`);
  };

  const fetchAllNodesAndEdges = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/graph/query/${queryMethod}`, {
        cypher: 'MATCH (n)-[r]->(m) RETURN n,r,m'
      });

      if (response.data.success) {
        const graphData = response.data.data;
        
        const visNodes = new DataSet();
        const visEdges = new DataSet();
        const nodeMap = new Map();

        if (graphData.nodes) {
          graphData.nodes.forEach((node, index) => {
            const nodeId = node.identity.low;
            const nodeType = node.labels[0] || 'Unknown';
            const nodeName = node.properties.name || `${nodeType}-${index}`;
            const riskLevel = getRiskLevel(nodeType, node.properties);
            
            visNodes.add({
              id: nodeId,
              label: nodeName,
              color: getNodeColor(nodeType),
              title: `${nodeType}: ${nodeName}\n风险等级: ${riskLevel.toUpperCase()}\n\n属性:\n${JSON.stringify(node.properties, null, 2)}`,
              group: riskLevel,
              level: node.properties.level || 0,
              properties: node.properties,
              labels: node.labels
            });
            
            nodeMap.set(nodeId, {
              id: nodeId,
              identity: node.identity,
              labels: node.labels,
              properties: node.properties
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
              arrows: 'to',
              color: { color: '#666666', highlight: '#333333' },
              title: `关系类型: ${rel.type}\n属性:\n${JSON.stringify(rel.properties, null, 2)}`
            });
          });
        }

        setNodes(Array.from(nodeMap.values()));
        setEdges(graphData.relationships || []);
        
        if (network) {
          network.setData({ nodes: visNodes, edges: visEdges });
          network.fit();
        }
        
        toast.success(`成功加载 ${visNodes.length} 个节点和 ${visEdges.length} 条关系`);
      }
    } catch (error) {
      console.error('Error fetching full graph data:', error);
      toast.error('获取完整图谱数据失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const showNodeDetails = (node) => {
    const nodeType = node.labels ? node.labels[0] : 'Unknown';
    const nodeName = node.properties ? node.properties.name : node.label || 'Unknown';
    const riskLevel = getRiskLevel(nodeType, node.properties || {});
    
    toast.info(
      <div style={{ minWidth: '300px' }}>
        <div className="mb-3">
          <span className={`badge bg-${getRiskBadgeColor(riskLevel)} me-2`}>
            {riskLevel.toUpperCase()}
          </span>
          <strong>{nodeType}</strong>
        </div>
        <div className="mb-2">
          <strong>名称:</strong> {nodeName}
        </div>
        <div className="mb-2">
          <strong>ID:</strong> {node.id}
        </div>
        {node.properties && (
          <div>
            <strong>属性:</strong>
            <pre style={{ fontSize: '12px', marginTop: '10px', maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(node.properties, null, 2)}
            </pre>
          </div>
        )}
        <div className="mt-3">
          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => highlightAttackPath(node.id)}>
            <i className="fas fa-route"></i> 攻击路径
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => isolateNode(node.id)}>
            <i className="fas fa-shield-alt"></i> 隔离
          </button>
        </div>
      </div>,
      {
        autoClose: false,
        closeButton: true
      }
    );
  };

  const getRiskBadgeColor = (riskLevel) => {
    const colors = {
      'critical': 'danger',
      'high': 'warning',
      'medium': 'info',
      'low': 'success'
    };
    return colors[riskLevel] || 'secondary';
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      toast.error('请输入 Cypher 查询语句');
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
        const processedNodes = [];

        if (graphData.nodes) {
          graphData.nodes.forEach((node, index) => {
            const nodeId = node.identity.low;
            const nodeType = node.labels[0] || 'Unknown';
            const nodeName = node.properties.name || `${nodeType}-${nodeId}`;
            
            visNodes.add({
              id: nodeId,
              label: nodeName,
              color: getNodeColor(nodeType),
              title: `${node.labels.join(', ')}: ${nodeName}`,
              properties: node.properties,
              labels: node.labels
            });
            
            processedNodes.push({
              id: nodeId,
              identity: node.identity,
              labels: node.labels,
              properties: node.properties
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

        setNodes(processedNodes);
        setEdges(graphData.relationships || []);
        
        if (network) {
          network.setData({ nodes: visNodes, edges: visEdges });
          network.fit();
        }
        
        toast.success(`查询执行成功，返回 ${visNodes.length} 个节点和 ${visEdges.length} 条关系`);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      const errorMsg = error.response?.data?.message || error.message;
      toast.error('查询执行失败: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filterByType = (type) => {
    const filteredNodes = nodes.filter(node => {
      const nodeType = node.labels ? node.labels[0] : (node.type || 'Unknown');
      return nodeType === type;
    });
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(edge => 
      nodeIds.has(edge.from?.low || edge.from) || nodeIds.has(edge.to?.low || edge.to)
    );

    const nodesDataset = new DataSet(
      filteredNodes.map(node => ({
        id: node.id,
        label: node.properties ? node.properties.name : node.label || `Unknown-${node.id}`,
        color: getNodeColor(node.labels ? node.labels[0] : node.type),
        title: `${node.labels ? node.labels[0] : node.type}: ${node.properties ? node.properties.name : node.label || `Unknown-${node.id}`}`,
        properties: node.properties,
        labels: node.labels
      }))
    );

    const edgesDataset = new DataSet(
      filteredEdges.map(edge => ({
        id: edge.id || edge.identity?.low,
        from: edge.from?.low || edge.from,
        to: edge.to?.low || edge.to,
        label: edge.type || edge.label,
        arrows: 'to'
      }))
    );

    if (network) {
      network.setData({ nodes: nodesDataset, edges: edgesDataset });
    }
  };

  const filterByRiskLevel = (riskLevel) => {
    const filteredNodes = nodes.filter(node => {
      const nodeType = node.labels ? node.labels[0] : (node.type || 'Unknown');
      const nodeProperties = node.properties || {};
      return getRiskLevel(nodeType, nodeProperties) === riskLevel;
    });
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(edge => 
      nodeIds.has(edge.from?.low || edge.from) || nodeIds.has(edge.to?.low || edge.to)
    );

    const nodesDataset = new DataSet(
      filteredNodes.map(node => {
        const nodeType = node.labels ? node.labels[0] : (node.type || 'Unknown');
        return {
          id: node.id,
          label: node.properties ? node.properties.name : node.label || `Unknown-${node.id}`,
          color: getNodeColor(nodeType),
          title: `${nodeType}: ${node.properties ? node.properties.name : node.label || `Unknown-${node.id}`}`,
          properties: node.properties,
          labels: node.labels
        };
      })
    );

    const edgesDataset = new DataSet(
      filteredEdges.map(edge => ({
        id: edge.id || edge.identity?.low,
        from: edge.from?.low || edge.from,
        to: edge.to?.low || edge.to,
        label: edge.type || edge.label,
        arrows: 'to'
      }))
    );

    if (network) {
      network.setData({ nodes: nodesDataset, edges: edgesDataset });
    }
  };

  const resetView = () => {
    fetchGraphData();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">
          <i className="fas fa-shield-alt me-2"></i>
          云安全攻击路径分析
        </h2>
        <div className="btn-group">
          <button 
            className={`btn ${viewMode === 'attack-path' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('attack-path')}
          >
            <i className="fas fa-route me-2"></i>攻击路径视图
          </button>
          <button 
            className={`btn ${viewMode === 'network' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('network')}
          >
            <i className="fas fa-network-wired me-2"></i>网络拓扑视图
          </button>
        </div>
      </div>
      
      <div className="row mb-3">
        <div className="col-md-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-gradient-primary text-white">
              <h5 className="card-title mb-0">
                <i className="fas fa-search me-2"></i>
                查询控制台
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-8">
                  <label className="form-label fw-bold">
                    <i className="fas fa-code me-1"></i>
                    Cypher 查询语句
                  </label>
                  <textarea
                    className="form-control font-monospace query-editor"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="输入 Cypher 查询语句..."
                    rows="3"
                    style={{ fontSize: '14px' }}
                  />
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="fas fa-info-circle me-1"></i>
                      提示: 使用 'MATCH (n)-[r]->(m) RETURN n,r,m' 查询完整的节点和关系
                    </small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label fw-bold">
                      <i className="fas fa-cog me-1"></i>
                      查询方式
                    </label>
                    <select 
                      className="form-select"
                      value={queryMethod}
                      onChange={(e) => setQueryMethod(e.target.value)}
                    >
                      <option value="bolt">Bolt 协议</option>
                      <option value="rest">REST API</option>
                    </select>
                  </div>
                  <div className="d-grid gap-2">
                    <button 
                      className="btn btn-primary"
                      onClick={executeQuery}
                      disabled={loading}
                    >
                      <i className="fas fa-play me-2"></i>
                      执行查询
                    </button>
                    <button 
                      className="btn btn-success"
                      onClick={fetchAllNodesAndEdges}
                      disabled={loading}
                    >
                      <i className="fas fa-globe me-2"></i>
                      显示全部
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={resetView}
                    >
                      <i className="fas fa-undo me-2"></i>
                      重置视图
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <label className="form-label fw-bold">
                  <i className="fas fa-filter me-1"></i>
                  快速过滤器 (按风险等级)
                </label>
                <div className="btn-group flex-wrap">
                  <button 
                    className="btn btn-outline-danger btn-sm mb-1" 
                    onClick={() => filterByRiskLevel('critical')}
                  >
                    <i className="fas fa-exclamation-triangle me-1"></i>
                    关键资产
                  </button>
                  <button 
                    className="btn btn-outline-warning btn-sm mb-1" 
                    onClick={() => filterByRiskLevel('high')}
                  >
                    <i className="fas fa-shield-alt me-1"></i>
                    高风险
                  </button>
                  <button 
                    className="btn btn-outline-info btn-sm mb-1" 
                    onClick={() => filterByRiskLevel('medium')}
                  >
                    <i className="fas fa-shield me-1"></i>
                    中风险
                  </button>
                  <button 
                    className="btn btn-outline-success btn-sm mb-1" 
                    onClick={() => filterByRiskLevel('low')}
                  >
                    <i className="fas fa-lock me-1"></i>
                    低风险
                  </button>
                </div>
                
                <div className="mt-2">
                  <label className="form-label fw-bold">
                    <i className="fas fa-filter me-1"></i>
                    按类型过滤
                  </label>
                  <div className="btn-group flex-wrap">
                    <button className="btn btn-outline-primary btn-sm mb-1" onClick={() => filterByType('Pod')}>
                      <i className="fas fa-cube me-1"></i>Pod
                    </button>
                    <button className="btn btn-outline-info btn-sm mb-1" onClick={() => filterByType('Service')}>
                      <i className="fas fa-server me-1"></i>Service
                    </button>
                    <button className="btn btn-outline-warning btn-sm mb-1" onClick={() => filterByType('Deployment')}>
                      <i className="fas fa-rocket me-1"></i>Deployment
                    </button>
                    <button className="btn btn-outline-success btn-sm mb-1" onClick={() => filterByType('Namespace')}>
                      <i className="fas fa-folder me-1"></i>Namespace
                    </button>
                    <button className="btn btn-outline-danger btn-sm mb-1" onClick={() => filterByType('Ingress')}>
                      <i className="fas fa-door-open me-1"></i>Ingress
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="row mb-3">
          <div className="col-md-12">
            <div className="card border-primary">
              <div className="card-header bg-primary text-white">
                <h6 className="card-title mb-0">
                  <i className="fas fa-info-circle me-2"></i>
                  选中的节点信息
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <strong>类型:</strong> {selectedNode.labels ? selectedNode.labels[0] : (selectedNode.type || 'Unknown')}<br/>
                    <strong>名称:</strong> {selectedNode.properties ? selectedNode.properties.name : selectedNode.label || 'Unknown'}<br/>
                    <strong>ID:</strong> {selectedNode.id}
                  </div>
                  <div className="col-md-6">
                    <button 
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => highlightAttackPath(selectedNode.id)}
                    >
                      <i className="fas fa-route me-1"></i>显示攻击路径
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => isolateNode(selectedNode.id)}
                    >
                      <i className="fas fa-shield-alt me-1"></i>隔离节点
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-md-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-gradient-dark text-white d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-project-diagram me-2"></i>
                {viewMode === 'attack-path' ? '攻击路径视图' : '网络拓扑视图'}
              </h5>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <span className="badge bg-danger me-1">关键</span>
                  <span className="badge bg-warning me-1">高</span>
                  <span className="badge bg-info me-1">中</span>
                  <span className="badge bg-success me-1">低</span>
                </div>
                <span className="me-3">
                  <i className="fas fa-cube me-1"></i>
                  节点: <span className="badge bg-light text-dark">{nodes.length}</span>
                </span>
                <span className="me-3">
                  <i className="fas fa-link me-1"></i>
                  关系: <span className="badge bg-light text-dark">{edges.length}</span>
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
                style={{ height: '700px', width: '100%', border: '1px solid #dee2e6' }}
                className="bg-light"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-3">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-keyboard me-2"></i>
                快捷键说明
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <kbd>左键点击</kbd> - 选择节点/显示攻击路径<br/>
                  <kbd>右键点击</kbd> - 显示节点操作菜单<br/>
                  <kbd>鼠标滚轮</kbd> - 缩放视图
                </div>
                <div className="col-md-6">
                  <kbd>拖拽</kbd> - 移动画布<br/>
                  <kbd>Ctrl + 拖拽</kbd> - 选择多个节点<br/>
                  <kbd>双击</kbd> - 聚焦节点
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;