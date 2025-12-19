const { KubeConfig, CoreV1Api, AppsV1Api, NetworkingV1Api, RbacAuthorizationV1Api, CustomObjectsApi } = require('@kubernetes/client-node');
const yaml = require('yaml');
const logger = require('../utils/logger');

class K8sAssetCollector {
  constructor() {
    this.kubeConfig = new KubeConfig();
    this.loadConfig();
    this.coreV1Api = this.kubeConfig.makeApiClient(CoreV1Api);
    this.appsV1Api = this.kubeConfig.makeApiClient(AppsV1Api);
    this.networkingV1Api = this.kubeConfig.makeApiClient(NetworkingV1Api);
    this.rbacV1Api = this.kubeConfig.makeApiClient(RbacAuthorizationV1Api);
    this.customObjectsApi = this.kubeConfig.makeApiClient(CustomObjectsApi);
  }

  loadConfig() {
    try {
      // Try to load in-cluster config first
      this.kubeConfig.loadFromCluster();
      logger.info('Loaded in-cluster Kubernetes config');
    } catch (error) {
      try {
        // Fallback to kubeconfig file
        this.kubeConfig.loadFromFile(process.env.K8S_CONFIG_PATH || `${process.env.HOME}/.kube/config`);
        logger.info('Loaded Kubernetes config from file');
      } catch (error) {
        logger.error('Failed to load Kubernetes config:', error);
        throw new Error('Could not load Kubernetes configuration');
      }
    }
  }

  async collectNamespaces() {
    try {
      const res = await this.coreV1Api.listNamespace();
      return res.body.items.map(ns => ({
        name: ns.metadata.name,
        status: ns.status.phase,
        creationTime: ns.metadata.creationTimestamp,
        labels: ns.metadata.labels,
        annotations: ns.metadata.annotations
      }));
    } catch (error) {
      logger.error('Error collecting namespaces:', error);
      return [];
    }
  }

  async collectPods(namespace = null) {
    try {
      const res = namespace 
        ? await this.coreV1Api.listNamespacedPod(namespace)
        : await this.coreV1Api.listPodForAllNamespaces();
      
      return res.body.items.map(pod => ({
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: pod.status.phase,
        podIP: pod.status.podIP,
        hostIP: pod.status.hostIP,
        nodeName: pod.spec.nodeName,
        serviceAccount: pod.spec.serviceAccountName,
        containers: pod.spec.containers.map(container => ({
          name: container.name,
          image: container.image,
          ports: container.ports || [],
          resources: container.resources,
          securityContext: container.securityContext
        })),
        labels: pod.metadata.labels,
        creationTime: pod.metadata.creationTimestamp
      }));
    } catch (error) {
      logger.error('Error collecting pods:', error);
      return [];
    }
  }

  async collectServices(namespace = null) {
    try {
      const res = namespace 
        ? await this.coreV1Api.listNamespacedService(namespace)
        : await this.coreV1Api.listServiceForAllNamespaces();
      
      return res.body.items.map(svc => ({
        name: svc.metadata.name,
        namespace: svc.metadata.namespace,
        type: svc.spec.type,
        clusterIP: svc.spec.clusterIP,
        externalIPs: svc.spec.externalIPs || [],
        ports: svc.spec.ports || [],
        selector: svc.spec.selector,
        labels: svc.metadata.labels,
        creationTime: svc.metadata.creationTimestamp
      }));
    } catch (error) {
      logger.error('Error collecting services:', error);
      return [];
    }
  }

  async collectDeployments(namespace = null) {
    try {
      const res = namespace 
        ? await this.appsV1Api.listNamespacedDeployment(namespace)
        : await this.appsV1Api.listDeploymentForAllNamespaces();
      
      return res.body.items.map(dep => ({
        name: dep.metadata.name,
        namespace: dep.metadata.namespace,
        replicas: dep.spec.replicas,
        readyReplicas: dep.status.readyReplicas || 0,
        selector: dep.spec.selector.matchLabels,
        template: {
          labels: dep.spec.template.metadata.labels,
          containers: dep.spec.template.spec.containers.map(container => ({
            name: container.name,
            image: container.image,
            ports: container.ports || [],
            resources: container.resources,
            securityContext: container.securityContext
          }))
        },
        labels: dep.metadata.labels,
        creationTime: dep.metadata.creationTimestamp
      }));
    } catch (error) {
      logger.error('Error collecting deployments:', error);
      return [];
    }
  }

  async collectIngresses(namespace = null) {
    try {
      const res = namespace 
        ? await this.networkingV1Api.listNamespacedIngress(namespace)
        : await this.networkingV1Api.listIngressForAllNamespaces();
      
      return res.body.items.map(ing => ({
        name: ing.metadata.name,
        namespace: ing.metadata.namespace,
        rules: ing.spec.rules || [],
        tls: ing.spec.tls || [],
        annotations: ing.metadata.annotations,
        labels: ing.metadata.labels,
        creationTime: ing.metadata.creationTimestamp
      }));
    } catch (error) {
      logger.error('Error collecting ingresses:', error);
      return [];
    }
  }

  async collectRoles(namespace = null) {
    try {
      const res = namespace 
        ? await this.rbacV1Api.listNamespacedRole(namespace)
        : await this.rbacV1Api.listRoleForAllNamespaces();
      
      return res.body.items.map(role => ({
        name: role.metadata.name,
        namespace: role.metadata.namespace,
        rules: role.rules || [],
        labels: role.metadata.labels,
        creationTime: role.metadata.creationTimestamp
      }));
    } catch (error) {
      logger.error('Error collecting roles:', error);
      return [];
    }
  }

  async collectClusterRoles() {
    try {
      const res = await this.rbacV1Api.listClusterRole();
      return res.body.items.map(cr => ({
        name: cr.metadata.name,
        rules: cr.rules || [],
        labels: cr.metadata.labels,
        creationTime: cr.metadata.creationTimestamp
      }));
    } catch (error) {
      logger.error('Error collecting cluster roles:', error);
      return [];
    }
  }

  async collectServiceAccounts(namespace = null) {
    try {
      const res = namespace 
        ? await this.coreV1Api.listNamespacedServiceAccount(namespace)
        : await this.coreV1Api.listServiceAccountForAllNamespaces();
      
      return res.body.items.map(sa => ({
        name: sa.metadata.name,
        namespace: sa.metadata.namespace,
        secrets: sa.secrets || [],
        labels: sa.metadata.labels,
        creationTime: sa.metadata.creationTimestamp
      }));
    } catch (error) {
      logger.error('Error collecting service accounts:', error);
      return [];
    }
  }

  async collectAllAssets() {
    logger.info('Starting to collect all Kubernetes assets...');
    const assets = {
      namespaces: await this.collectNamespaces(),
      pods: await this.collectPods(),
      services: await this.collectServices(),
      deployments: await this.collectDeployments(),
      ingresses: await this.collectIngresses(),
      roles: await this.collectRoles(),
      clusterRoles: await this.collectClusterRoles(),
      serviceAccounts: await this.collectServiceAccounts()
    };
    
    logger.info(`Collected ${Object.values(assets).reduce((acc, val) => acc + val.length, 0)} total assets`);
    return assets;
  }

  async collectAssetRelationships() {
    logger.info('Analyzing asset relationships...');
    const relationships = [];
    const assets = await this.collectAllAssets();
    
    // Pod to Namespace relationships
    assets.pods.forEach(pod => {
      relationships.push({
        source: { type: 'Pod', name: pod.name, namespace: pod.namespace },
        target: { type: 'Namespace', name: pod.namespace },
        relation: 'BELONGS_TO'
      });
    });
    
    // Service to Pod relationships
    assets.services.forEach(service => {
      if (service.selector) {
        assets.pods.forEach(pod => {
          if (this.matchesSelector(pod.labels, service.selector)) {
            relationships.push({
              source: { type: 'Service', name: service.name, namespace: service.namespace },
              target: { type: 'Pod', name: pod.name, namespace: pod.namespace },
              relation: 'SELECTS'
            });
          }
        });
      }
    });
    
    // Deployment to Pod relationships
    assets.deployments.forEach(deployment => {
      if (deployment.selector) {
        assets.pods.forEach(pod => {
          if (this.matchesSelector(pod.labels, deployment.selector)) {
            relationships.push({
              source: { type: 'Deployment', name: deployment.name, namespace: deployment.namespace },
              target: { type: 'Pod', name: pod.name, namespace: pod.namespace },
              relation: 'MANAGES'
            });
          }
        });
      }
    });
    
    // ServiceAccount to Pod relationships
    assets.serviceAccounts.forEach(sa => {
      assets.pods.forEach(pod => {
        if (pod.serviceAccount === sa.name && pod.namespace === sa.namespace) {
          relationships.push({
            source: { type: 'ServiceAccount', name: sa.name, namespace: sa.namespace },
            target: { type: 'Pod', name: pod.name, namespace: pod.namespace },
            relation: 'PROVIDES_IDENTITY'
          });
        }
      });
    });
    
    // Role/ClusterRole to ServiceAccount relationships via RoleBinding
    // Note: This would require additional API calls to collect RoleBindings and ClusterRoleBindings
    
    logger.info(`Found ${relationships.length} relationships`);
    return relationships;
  }

  matchesSelector(labels, selector) {
    if (!labels || !selector) return false;
    for (const [key, value] of Object.entries(selector)) {
      if (labels[key] !== value) return false;
    }
    return true;
  }
}

module.exports = K8sAssetCollector;