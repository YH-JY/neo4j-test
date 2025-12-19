const axios = require('axios');
const logger = require('../utils/logger');

class Neo4jRestService {
  constructor() {
    this.uri = process.env.NEO4J_URI;
    this.username = process.env.NEO4J_USER;
    this.password = process.env.NEO4J_PASSWORD;
    this.authHeader = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    
    // Create indexes for better performance
    this.createIndexes();
  }

  async executeQuery(cypher, params = {}) {
    try {
      const response = await axios.post(
        `${this.uri}/db/neo4j/tx/commit`,
        {
          statements: [{
            statement: cypher,
            parameters: params
          }]
        },
        {
          headers: {
            'Authorization': `Basic ${this.authHeader}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.results[0];
    } catch (error) {
      logger.error('Neo4j REST API query error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX node_name_index IF NOT EXISTS FOR (n:Node) ON (n.name)',
      'CREATE INDEX pod_name_index IF NOT EXISTS FOR (p:Pod) ON (p.name)',
      'CREATE INDEX service_name_index IF NOT EXISTS FOR (s:Service) ON (s.name)',
      'CREATE INDEX namespace_name_index IF NOT EXISTS FOR (ns:Namespace) ON (ns.name)',
      'CREATE INDEX deployment_name_index IF NOT EXISTS FOR (d:Deployment) ON (d.name)'
    ];

    for (const indexQuery of indexes) {
      try {
        await this.executeQuery(indexQuery);
        logger.info('Index created/verified');
      } catch (error) {
        logger.warn('Index creation warning:', error.message);
      }
    }
  }

  async clearGraph() {
    const cypher = 'MATCH (n) DETACH DELETE n';
    const result = await this.executeQuery(cypher);
    logger.info('Graph cleared');
    return result;
  }

  async createNode(label, properties) {
    const cypher = `
      CREATE (n:${label} $props)
      RETURN n
    `;
    const result = await this.executeQuery(cypher, { props: properties });
    return result.data[0][0];
  }

  async createRelationship(startNodeLabel, startNodeProps, relationshipType, endNodeLabel, endNodeProps) {
    const cypher = `
      MATCH (a:${startNodeLabel} $startProps)
      MATCH (b:${endNodeLabel} $endProps)
      MERGE (a)-[r:${relationshipType}]->(b)
      RETURN r
    `;
    const result = await this.executeQuery(cypher, {
      startProps: startNodeProps,
      endProps: endNodeProps
    });
    return result.data[0][0];
  }

  async importK8sAssets(assets, relationships) {
    logger.info('Starting import with Neo4j REST API...');
    
    try {
      // Clear existing data
      await this.clearGraph();
      
      // Create nodes for each asset type
      const createdNodes = {};
      
      // Import Namespaces
      for (const ns of assets.namespaces) {
        const node = await this.createNode('Namespace', {
          name: ns.name,
          status: ns.status,
          creationTime: ns.creationTime,
          labels: ns.labels || {},
          type: 'Namespace'
        });
        createdNodes[`namespace:${ns.name}`] = node;
      }
      
      // Import Pods
      for (const pod of assets.pods) {
        const node = await this.createNode('Pod', {
          name: pod.name,
          namespace: pod.namespace,
          status: pod.status,
          podIP: pod.podIP,
          hostIP: pod.hostIP,
          nodeName: pod.nodeName,
          serviceAccount: pod.serviceAccount,
          creationTime: pod.creationTime,
          labels: pod.labels || {},
          type: 'Pod'
        });
        createdNodes[`pod:${pod.namespace}:${pod.name}`] = node;
      }
      
      // Import Services
      for (const svc of assets.services) {
        const node = await this.createNode('Service', {
          name: svc.name,
          namespace: svc.namespace,
          type: svc.type,
          clusterIP: svc.clusterIP,
          externalIPs: svc.externalIPs,
          ports: svc.ports,
          selector: svc.selector,
          creationTime: svc.creationTime,
          labels: svc.labels || {},
          nodeType: 'Service'
        });
        createdNodes[`service:${svc.namespace}:${svc.name}`] = node;
      }
      
      // Import Deployments
      for (const dep of assets.deployments) {
        const node = await this.createNode('Deployment', {
          name: dep.name,
          namespace: dep.namespace,
          replicas: dep.replicas,
          readyReplicas: dep.readyReplicas,
          selector: dep.selector,
          creationTime: dep.creationTime,
          labels: dep.labels || {},
          nodeType: 'Deployment'
        });
        createdNodes[`deployment:${dep.namespace}:${dep.name}`] = node;
      }
      
      // Import Ingresses
      for (const ing of assets.ingresses) {
        const node = await this.createNode('Ingress', {
          name: ing.name,
          namespace: ing.namespace,
          rules: ing.rules,
          tls: ing.tls,
          annotations: ing.annotations,
          creationTime: ing.creationTime,
          labels: ing.labels || {},
          nodeType: 'Ingress'
        });
        createdNodes[`ingress:${ing.namespace}:${ing.name}`] = node;
      }
      
      // Import ServiceAccounts
      for (const sa of assets.serviceAccounts) {
        const node = await this.createNode('ServiceAccount', {
          name: sa.name,
          namespace: sa.namespace,
          secrets: sa.secrets,
          creationTime: sa.creationTime,
          labels: sa.labels || {},
          nodeType: 'ServiceAccount'
        });
        createdNodes[`serviceaccount:${sa.namespace}:${sa.name}`] = node;
      }
      
      // Import Roles
      for (const role of assets.roles) {
        const node = await this.createNode('Role', {
          name: role.name,
          namespace: role.namespace,
          rules: role.rules,
          creationTime: role.creationTime,
          labels: role.labels || {},
          nodeType: 'Role'
        });
        createdNodes[`role:${role.namespace}:${role.name}`] = node;
      }
      
      // Import ClusterRoles
      for (const cr of assets.clusterRoles) {
        const node = await this.createNode('ClusterRole', {
          name: cr.name,
          rules: cr.rules,
          creationTime: cr.creationTime,
          labels: cr.labels || {},
          nodeType: 'ClusterRole'
        });
        createdNodes[`clusterrole:${cr.name}`] = node;
      }
      
      // Create relationships
      for (const rel of relationships) {
        const { source, target, relation } = rel;
        await this.executeQuery(`
          MATCH (a {name: $sourceName, type: $sourceType})
          MATCH (b {name: $targetName, type: $targetType})
          MERGE (a)-[r:${relation}]->(b)
        `, {
          sourceName: source.name,
          sourceType: source.type,
          targetName: target.name,
          targetType: target.type
        });
      }
      
      logger.info('Successfully imported K8s assets using REST API');
      return { success: true, message: 'Import completed' };
      
    } catch (error) {
      logger.error('Error importing K8s assets via REST API:', error);
      throw error;
    }
  }

  async queryGraph(cypher, params = {}) {
    const result = await this.executeQuery(cypher, params);
    return {
      nodes: result.data.map(row => row[0]),
      relationships: result.data.map(row => row[1]) || []
    };
  }

  async getAttackPaths(startNode, endNode) {
    const cypher = `
      MATCH path = shortestPath((start {name: $startNode})-[*..5]-(end {name: $endNode}))
      RETURN path
    `;
    const result = await this.executeQuery(cypher, { startNode, endNode });
    return result.data.map(row => row[0]);
  }

  async getVulnerabilityPaths() {
    const cypher = `
      MATCH (a:Pod)-[:CONNECTS_TO]->(b:Service)
      MATCH (c:Pod)-[:RUNS_AS]->(d:ServiceAccount)
      WHERE d.name = 'default'
      RETURN a, b, c, d
    `;
    const result = await this.executeQuery(cypher);
    return result.data;
  }
}

module.exports = Neo4jRestService;