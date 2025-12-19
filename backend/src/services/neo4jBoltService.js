const neo4j = require('neo4j-driver');
const logger = require('../utils/logger');

class Neo4jBoltService {
  constructor() {
    this.uri = process.env.NEO4J_BOLT_URL;
    this.username = process.env.NEO4J_USER;
    this.password = process.env.NEO4J_PASSWORD;
    this.driver = null;
    this.connect();
  }

  connect() {
    try {
      this.driver = neo4j.driver(
        this.uri,
        neo4j.auth.basic(this.username, this.password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 60000
        }
      );
      
      // Test connection
      this.driver.verifyConnectivity()
        .then(() => {
          logger.info('Connected to Neo4j using Bolt protocol');
          this.createIndexes();
        })
        .catch(error => {
          logger.error('Neo4j Bolt connection failed:', error);
        });
    } catch (error) {
      logger.error('Error initializing Neo4j Bolt driver:', error);
    }
  }

  async getSession() {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }
    return this.driver.session();
  }

  async executeQuery(cypher, params = {}) {
    const session = await this.getSession();
    try {
      const result = await session.run(cypher, params);
      return result;
    } finally {
      await session.close();
    }
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX node_name_bolt_index IF NOT EXISTS FOR (n:Node) ON (n.name)',
      'CREATE INDEX pod_name_bolt_index IF NOT EXISTS FOR (p:Pod) ON (p.name)',
      'CREATE INDEX service_name_bolt_index IF NOT EXISTS FOR (s:Service) ON (s.name)',
      'CREATE INDEX namespace_name_bolt_index IF NOT EXISTS FOR (ns:Namespace) ON (ns.name)',
      'CREATE INDEX deployment_name_bolt_index IF NOT EXISTS FOR (d:Deployment) ON (d.name)'
    ];

    for (const indexQuery of indexes) {
      try {
        await this.executeQuery(indexQuery);
        logger.info('Bolt index created/verified');
      } catch (error) {
        logger.warn('Bolt index creation warning:', error.message);
      }
    }
  }

  async clearGraph() {
    const cypher = 'MATCH (n) DETACH DELETE n';
    await this.executeQuery(cypher);
    logger.info('Graph cleared via Bolt');
  }

  async createNode(label, properties) {
    const cypher = `
      CREATE (n:${label} $props)
      RETURN n
    `;
    const result = await this.executeQuery(cypher, { props: properties });
    return result.records[0].get(0);
  }

  async createNodesBatch(nodes) {
    const session = await this.getSession();
    const tx = session.beginTransaction();
    
    try {
      for (const node of nodes) {
        const { label, properties } = node;
        await tx.run(`
          CREATE (n:${label} $props)
        `, { props: properties });
      }
      
      await tx.commit();
      logger.info(`Batch created ${nodes.length} nodes`);
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      await session.close();
    }
  }

  async createRelationshipBatch(relationships) {
    const session = await this.getSession();
    const tx = session.beginTransaction();
    
    try {
      for (const rel of relationships) {
        await tx.run(`
          MATCH (a {name: $sourceName, type: $sourceType})
          MATCH (b {name: $targetName, type: $targetType})
          MERGE (a)-[r:${rel.relation}]->(b)
        `, {
          sourceName: rel.source.name,
          sourceType: rel.source.type,
          targetName: rel.target.name,
          targetType: rel.target.type
        });
      }
      
      await tx.commit();
      logger.info(`Batch created ${relationships.length} relationships`);
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      await session.close();
    }
  }

  async importK8sAssets(assets, relationships) {
    logger.info('Starting import with Neo4j Bolt protocol...');
    
    try {
      // Clear existing data
      await this.clearGraph();
      
      // Prepare all nodes for batch creation
      const allNodes = [];
      
      // Add Namespaces
      assets.namespaces.forEach(ns => {
        allNodes.push({
          label: 'Namespace',
          properties: {
            name: ns.name,
            status: ns.status,
            creationTime: ns.creationTime,
            labels: JSON.stringify(ns.labels || {}),
            type: 'Namespace'
          }
        });
      });
      
      // Add Pods
      assets.pods.forEach(pod => {
        allNodes.push({
          label: 'Pod',
          properties: {
            name: pod.name,
            namespace: pod.namespace,
            status: pod.status,
            podIP: pod.podIP,
            hostIP: pod.hostIP,
            nodeName: pod.nodeName,
            serviceAccount: pod.serviceAccount,
            creationTime: pod.creationTime,
            labels: JSON.stringify(pod.labels || {}),
            containers: JSON.stringify(pod.containers || []),
            type: 'Pod'
          }
        });
      });
      
      // Add Services
      assets.services.forEach(svc => {
        allNodes.push({
          label: 'Service',
          properties: {
            name: svc.name,
            namespace: svc.namespace,
            type: svc.type,
            clusterIP: svc.clusterIP,
            externalIPs: JSON.stringify(svc.externalIPs || []),
            ports: JSON.stringify(svc.ports || []),
            selector: JSON.stringify(svc.selector || {}),
            creationTime: svc.creationTime,
            labels: JSON.stringify(svc.labels || {}),
            nodeType: 'Service'
          }
        });
      });
      
      // Add Deployments
      assets.deployments.forEach(dep => {
        allNodes.push({
          label: 'Deployment',
          properties: {
            name: dep.name,
            namespace: dep.namespace,
            replicas: dep.replicas,
            readyReplicas: dep.readyReplicas,
            selector: JSON.stringify(dep.selector || {}),
            template: JSON.stringify(dep.template || {}),
            creationTime: dep.creationTime,
            labels: JSON.stringify(dep.labels || {}),
            nodeType: 'Deployment'
          }
        });
      });
      
      // Add Ingresses
      assets.ingresses.forEach(ing => {
        allNodes.push({
          label: 'Ingress',
          properties: {
            name: ing.name,
            namespace: ing.namespace,
            rules: JSON.stringify(ing.rules || []),
            tls: JSON.stringify(ing.tls || []),
            annotations: JSON.stringify(ing.annotations || {}),
            creationTime: ing.creationTime,
            labels: JSON.stringify(ing.labels || {}),
            nodeType: 'Ingress'
          }
        });
      });
      
      // Add ServiceAccounts
      assets.serviceAccounts.forEach(sa => {
        allNodes.push({
          label: 'ServiceAccount',
          properties: {
            name: sa.name,
            namespace: sa.namespace,
            secrets: JSON.stringify(sa.secrets || []),
            creationTime: sa.creationTime,
            labels: JSON.stringify(sa.labels || {}),
            nodeType: 'ServiceAccount'
          }
        });
      });
      
      // Add Roles
      assets.roles.forEach(role => {
        allNodes.push({
          label: 'Role',
          properties: {
            name: role.name,
            namespace: role.namespace,
            rules: JSON.stringify(role.rules || []),
            creationTime: role.creationTime,
            labels: JSON.stringify(role.labels || {}),
            nodeType: 'Role'
          }
        });
      });
      
      // Add ClusterRoles
      assets.clusterRoles.forEach(cr => {
        allNodes.push({
          label: 'ClusterRole',
          properties: {
            name: cr.name,
            rules: JSON.stringify(cr.rules || []),
            creationTime: cr.creationTime,
            labels: JSON.stringify(cr.labels || {}),
            nodeType: 'ClusterRole'
          }
        });
      });
      
      // Batch create nodes
      await this.createNodesBatch(allNodes);
      
      // Batch create relationships
      await this.createRelationshipBatch(relationships);
      
      logger.info('Successfully imported K8s assets using Bolt protocol');
      return { success: true, message: 'Bolt import completed' };
      
    } catch (error) {
      logger.error('Error importing K8s assets via Bolt:', error);
      throw error;
    }
  }

  async queryGraph(cypher, params = {}) {
    const result = await this.executeQuery(cypher, params);
    
    // Format results for consistency with REST API
    const nodes = [];
    const relationships = [];
    
    result.records.forEach(record => {
      record.keys.forEach((key, index) => {
        const value = record.get(key);
        if (value && value.labels) {
          // It's a node
          nodes.push(value);
        } else if (value && value.type) {
          // It's a relationship
          relationships.push(value);
        }
      });
    });
    
    return { nodes, relationships };
  }

  async getAttackPaths(startNode, endNode) {
    const cypher = `
      MATCH path = shortestPath((start {name: $startNode})-[*..5]-(end {name: $endNode}))
      RETURN path
    `;
    const result = await this.executeQuery(cypher, { startNode, endNode });
    return result.records.map(record => record.get('path'));
  }

  async getVulnerabilityPaths() {
    const cypher = `
      MATCH (a:Pod)-[:CONNECTS_TO]->(b:Service)
      MATCH (c:Pod)-[:RUNS_AS]->(d:ServiceAccount)
      WHERE d.name = 'default'
      RETURN a, b, c, d
    `;
    const result = await this.executeQuery(cypher);
    return result.records;
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
      logger.info('Neo4j Bolt driver closed');
    }
  }
}

module.exports = Neo4jBoltService;