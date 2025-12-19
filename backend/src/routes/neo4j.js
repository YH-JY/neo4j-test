const express = require('express');
const router = express.Router();
const Neo4jRestService = require('../services/neo4jRestService');
const Neo4jBoltService = require('../services/neo4jBoltService');
const K8sAssetCollector = require('../services/k8sCollector');
const logger = require('../utils/logger');

const neo4jRestService = new Neo4jRestService();
const neo4jBoltService = new Neo4jBoltService();
const k8sCollector = new K8sAssetCollector();

// Import K8s assets using REST API
router.post('/import/rest', async (req, res) => {
  try {
    const { namespace } = req.query;
    
    // Collect assets
    const assets = await k8sCollector.collectAllAssets();
    const relationships = await k8sCollector.collectAssetRelationships();
    
    // Import using REST API
    const result = await neo4jRestService.importK8sAssets(assets, relationships);
    
    res.json({
      success: true,
      data: result,
      assetsCount: Object.values(assets).reduce((acc, val) => acc + val.length, 0),
      relationshipsCount: relationships.length
    });
  } catch (error) {
    logger.error('Error importing via REST API:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import assets via REST API',
      message: error.message
    });
  }
});

// Import K8s assets using Bolt protocol
router.post('/import/bolt', async (req, res) => {
  try {
    const { namespace } = req.query;
    
    // Collect assets
    const assets = await k8sCollector.collectAllAssets();
    const relationships = await k8sCollector.collectAssetRelationships();
    
    // Import using Bolt protocol
    const result = await neo4jBoltService.importK8sAssets(assets, relationships);
    
    res.json({
      success: true,
      data: result,
      assetsCount: Object.values(assets).reduce((acc, val) => acc + val.length, 0),
      relationshipsCount: relationships.length
    });
  } catch (error) {
    logger.error('Error importing via Bolt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import assets via Bolt',
      message: error.message
    });
  }
});

// Clear graph using REST API
router.delete('/clear/rest', async (req, res) => {
  try {
    const result = await neo4jRestService.clearGraph();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error clearing graph via REST:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear graph via REST API',
      message: error.message
    });
  }
});

// Clear graph using Bolt
router.delete('/clear/bolt', async (req, res) => {
  try {
    const result = await neo4jBoltService.clearGraph();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error clearing graph via Bolt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear graph via Bolt',
      message: error.message
    });
  }
});

// Health check for Neo4j connections
router.get('/health', async (req, res) => {
  const health = {
    rest: false,
    bolt: false
  };
  
  try {
    await neo4jRestService.executeQuery('RETURN 1');
    health.rest = true;
  } catch (error) {
    logger.warn('Neo4j REST health check failed:', error.message);
  }
  
  try {
    await neo4jBoltService.executeQuery('RETURN 1');
    health.bolt = true;
  } catch (error) {
    logger.warn('Neo4j Bolt health check failed:', error.message);
  }
  
  res.json({
    success: true,
    connections: health
  });
});

module.exports = router;