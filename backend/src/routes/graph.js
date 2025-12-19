const express = require('express');
const router = express.Router();
const Neo4jRestService = require('../services/neo4jRestService');
const Neo4jBoltService = require('../services/neo4jBoltService');
const logger = require('../utils/logger');

const neo4jRestService = new Neo4jRestService();
const neo4jBoltService = new Neo4jBoltService();

// Query graph using REST API
router.post('/query/rest', async (req, res) => {
  try {
    const { cypher, params } = req.body;
    
    if (!cypher) {
      return res.status(400).json({
        success: false,
        error: 'Cypher query is required'
      });
    }
    
    const result = await neo4jRestService.queryGraph(cypher, params || {});
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error querying graph via REST:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query graph via REST API',
      message: error.message
    });
  }
});

// Query graph using Bolt
router.post('/query/bolt', async (req, res) => {
  try {
    const { cypher, params } = req.body;
    
    if (!cypher) {
      return res.status(400).json({
        success: false,
        error: 'Cypher query is required'
      });
    }
    
    const result = await neo4jBoltService.queryGraph(cypher, params || {});
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error querying graph via Bolt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query graph via Bolt',
      message: error.message
    });
  }
});

// Get attack paths using REST API
router.post('/attack-paths/rest', async (req, res) => {
  try {
    const { startNode, endNode } = req.body;
    
    if (!startNode || !endNode) {
      return res.status(400).json({
        success: false,
        error: 'Both startNode and endNode are required'
      });
    }
    
    const paths = await neo4jRestService.getAttackPaths(startNode, endNode);
    
    res.json({
      success: true,
      data: paths,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting attack paths via REST:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get attack paths via REST API',
      message: error.message
    });
  }
});

// Get attack paths using Bolt
router.post('/attack-paths/bolt', async (req, res) => {
  try {
    const { startNode, endNode } = req.body;
    
    if (!startNode || !endNode) {
      return res.status(400).json({
        success: false,
        error: 'Both startNode and endNode are required'
      });
    }
    
    const paths = await neo4jBoltService.getAttackPaths(startNode, endNode);
    
    res.json({
      success: true,
      data: paths,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting attack paths via Bolt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get attack paths via Bolt',
      message: error.message
    });
  }
});

// Get vulnerability paths using REST API
router.get('/vulnerabilities/rest', async (req, res) => {
  try {
    const vulnerabilities = await neo4jRestService.getVulnerabilityPaths();
    
    res.json({
      success: true,
      data: vulnerabilities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting vulnerability paths via REST:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vulnerability paths via REST API',
      message: error.message
    });
  }
});

// Get vulnerability paths using Bolt
router.get('/vulnerabilities/bolt', async (req, res) => {
  try {
    const vulnerabilities = await neo4jBoltService.getVulnerabilityPaths();
    
    res.json({
      success: true,
      data: vulnerabilities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting vulnerability paths via Bolt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vulnerability paths via Bolt',
      message: error.message
    });
  }
});

// Get all nodes for visualization
router.get('/nodes', async (req, res) => {
  try {
    const cypher = 'MATCH (n) RETURN n LIMIT 1000';
    const result = await neo4jBoltService.queryGraph(cypher);
    
    // Transform nodes for visualization
    const nodes = result.nodes.map(node => ({
      id: `${node.identity.low}`,
      label: node.properties.name || node.labels[0],
      type: node.labels[0],
      properties: node.properties
    }));
    
    // Get relationships
    const relsResult = await neo4jBoltService.queryGraph('MATCH ()-[r]->() RETURN r LIMIT 2000');
    const edges = relsResult.relationships.map(rel => ({
      id: `${rel.identity.low}`,
      from: `${rel.start.low}`,
      to: `${rel.end.low}`,
      label: rel.type
    }));
    
    res.json({
      success: true,
      data: {
        nodes,
        edges
      }
    });
  } catch (error) {
    logger.error('Error getting graph data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get graph data',
      message: error.message
    });
  }
});

// Get graph statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {};
    
    // Get node counts by type
    const types = ['Pod', 'Service', 'Deployment', 'Namespace', 'Ingress', 'ServiceAccount', 'Role', 'ClusterRole'];
    for (const type of types) {
      const result = await neo4jBoltService.executeQuery(`MATCH (n:${type}) RETURN count(n) as count`);
      stats[type] = result.records[0].get('count').low || 0;
    }
    
    // Get total relationships count
    const relResult = await neo4jBoltService.executeQuery('MATCH ()-[r]->() RETURN count(r) as count');
    stats.relationships = relResult.records[0].get('count').low || 0;
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting graph stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get graph statistics',
      message: error.message
    });
  }
});

module.exports = router;