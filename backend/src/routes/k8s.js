const express = require('express');
const router = express.Router();
const K8sAssetCollector = require('../services/k8sCollector');
const logger = require('../utils/logger');

const k8sCollector = new K8sAssetCollector();

// Get all assets
router.get('/assets', async (req, res) => {
  try {
    const { namespace } = req.query;
    const assets = await k8sCollector.collectAllAssets();
    res.json({
      success: true,
      data: assets,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching K8s assets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Kubernetes assets',
      message: error.message
    });
  }
});

// Get specific asset type
router.get('/assets/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { namespace } = req.query;
    
    let assets;
    switch (type) {
      case 'pods':
        assets = await k8sCollector.collectPods(namespace);
        break;
      case 'services':
        assets = await k8sCollector.collectServices(namespace);
        break;
      case 'deployments':
        assets = await k8sCollector.collectDeployments(namespace);
        break;
      case 'namespaces':
        assets = await k8sCollector.collectNamespaces();
        break;
      case 'ingresses':
        assets = await k8sCollector.collectIngresses(namespace);
        break;
      case 'roles':
        assets = await k8sCollector.collectRoles(namespace);
        break;
      case 'clusterroles':
        assets = await k8sCollector.collectClusterRoles();
        break;
      case 'serviceaccounts':
        assets = await k8sCollector.collectServiceAccounts(namespace);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid asset type'
        });
    }
    
    res.json({
      success: true,
      data: assets,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error fetching ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch ${req.params.type}`,
      message: error.message
    });
  }
});

// Get asset relationships
router.get('/relationships', async (req, res) => {
  try {
    const relationships = await k8sCollector.collectAssetRelationships();
    res.json({
      success: true,
      data: relationships,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching asset relationships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch asset relationships',
      message: error.message
    });
  }
});

// Health check for K8s connection
router.get('/health', async (req, res) => {
  try {
    const namespaces = await k8sCollector.collectNamespaces();
    res.json({
      success: true,
      connected: true,
      namespacesCount: namespaces.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

module.exports = router;