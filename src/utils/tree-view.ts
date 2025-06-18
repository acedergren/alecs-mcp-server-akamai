/**
 * Tree view utilities for hierarchical display of groups and properties
 */

export interface TreeNode {
  type: 'group' | 'property';
  id: string;
  name: string;
  children?: TreeNode[];
  metadata?: {
    version?: number;
    status?: string;
    propertyCount?: number;
    [key: string]: any;
  };
}

export interface TreeViewOptions {
  showEmptyGroups?: boolean;
  showPropertyIds?: boolean;
  showVersions?: boolean;
  showStatus?: boolean;
  indentSize?: number;
}

const DEFAULT_OPTIONS: TreeViewOptions = {
  showEmptyGroups: true,
  showPropertyIds: true,
  showVersions: true,
  showStatus: true,
  indentSize: 4,
};

/**
 * Renders a tree structure with proper formatting
 */
export function renderTree(
  nodes: TreeNode[],
  options: TreeViewOptions = DEFAULT_OPTIONS,
  level: number = 0,
  isLast: boolean[] = []
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let output = '';

  nodes.forEach((node, index) => {
    const isLastNode = index === nodes.length - 1;
    const newIsLast = [...isLast, isLastNode];

    // Build the tree structure line
    let line = '';
    for (let i = 0; i < level; i++) {
      if (i === level - 1) {
        line += isLast[i] ? '└── ' : '├── ';
      } else {
        line += isLast[i] ? '    ' : '│   ';
      }
    }

    // Add icon based on type
    const icon = node.type === 'group' ? '📁' : '📦';
    line += `${icon} ${node.name}`;

    // Add metadata
    if (node.type === 'group' && node.metadata?.propertyCount !== undefined) {
      const count = node.metadata.propertyCount;
      if (count === 0 && !opts.showEmptyGroups) {
        return; // Skip empty groups if option is set
      }
      line += ` (${node.id})`;
      line += count === 0 ? ' - Empty' : ` - ${count} ${count === 1 ? 'property' : 'properties'}`;
    } else if (node.type === 'property') {
      if (opts.showPropertyIds) {
        line += ` (${node.id})`;
      }
      if (opts.showVersions && node.metadata?.version) {
        line += ` - v${node.metadata.version}`;
      }
      if (opts.showStatus && node.metadata?.status) {
        line += `, ${node.metadata.status}`;
      }
    }

    output += line + '\n';

    // Recursively render children
    if (node.children && node.children.length > 0) {
      // Add extra line before children for groups with properties
      if (node.type === 'group' && node.children.some(child => child.type === 'property')) {
        output += buildIndent(level + 1, newIsLast) + '\n';
      }
      
      output += renderTree(node.children, opts, level + 1, newIsLast);
      
      // Add extra line after children if not the last node
      if (!isLastNode && level === 0) {
        output += '\n';
      }
    }
  });

  return output;
}

/**
 * Builds proper indentation for a given level
 */
function buildIndent(level: number, isLast: boolean[]): string {
  let indent = '';
  for (let i = 0; i < level; i++) {
    indent += isLast[i] ? '    ' : '│   ';
  }
  return indent.trimEnd();
}

/**
 * Generates summary statistics from a tree structure
 */
export function generateTreeSummary(nodes: TreeNode[]): string {
  const stats = calculateTreeStats(nodes);
  
  let summary = '\n**Summary:**\n';
  summary += `- **Total Properties**: ${stats.totalProperties}\n`;
  
  if (stats.groupStats.length > 0) {
    summary += `- **Property Distribution**:\n`;
    stats.groupStats.forEach(group => {
      if (group.level === 0) {
        summary += `  - **Direct in ${group.name}**: ${group.directProperties}\n`;
      }
    });
    
    const subgroupProperties = stats.totalProperties - stats.rootProperties;
    if (subgroupProperties > 0) {
      summary += `  - **In Subgroups**: ${subgroupProperties}\n`;
    }
  }
  
  if (stats.emptyGroups > 0) {
    summary += `- **Empty Subgroups**: ${stats.emptyGroups}`;
    if (stats.emptyGroupNames.length > 0) {
      summary += ` (${stats.emptyGroupNames.join(', ')})`;
    }
    summary += '\n';
  }
  
  return summary;
}

interface TreeStats {
  totalProperties: number;
  rootProperties: number;
  emptyGroups: number;
  emptyGroupNames: string[];
  groupStats: {
    name: string;
    level: number;
    directProperties: number;
    totalProperties: number;
  }[];
}

function calculateTreeStats(nodes: TreeNode[], level: number = 0): TreeStats {
  const stats: TreeStats = {
    totalProperties: 0,
    rootProperties: 0,
    emptyGroups: 0,
    emptyGroupNames: [],
    groupStats: [],
  };

  nodes.forEach(node => {
    if (node.type === 'property') {
      stats.totalProperties++;
      if (level === 0) {
        stats.rootProperties++;
      }
    } else if (node.type === 'group') {
      const groupStat = {
        name: node.name,
        level,
        directProperties: 0,
        totalProperties: 0,
      };

      if (node.children) {
        const childStats = calculateTreeStats(node.children, level + 1);
        groupStat.directProperties = node.children.filter(child => child.type === 'property').length;
        groupStat.totalProperties = childStats.totalProperties;
        
        stats.totalProperties += childStats.totalProperties;
        stats.emptyGroups += childStats.emptyGroups;
        stats.emptyGroupNames.push(...childStats.emptyGroupNames);
        stats.groupStats.push(...childStats.groupStats);
      }

      if (groupStat.totalProperties === 0 && groupStat.directProperties === 0) {
        stats.emptyGroups++;
        stats.emptyGroupNames.push(node.name);
      }

      stats.groupStats.push(groupStat);
    }
  });

  return stats;
}

/**
 * Formats a property for tree display
 */
export function formatPropertyNode(
  property: any,
  showDetails: boolean = true
): TreeNode {
  const node: TreeNode = {
    type: 'property',
    id: property.propertyId,
    name: property.propertyName,
    metadata: {},
  };

  if (showDetails) {
    node.metadata = {
      version: property.latestVersion || property.version,
      status: property.productionStatus === 'ACTIVE' ? 'Active' : 'Inactive',
      staging: property.stagingStatus,
      production: property.productionStatus,
    };
  }

  return node;
}

/**
 * Formats a group for tree display
 */
export function formatGroupNode(
  group: any,
  properties: any[] = [],
  childGroups: any[] = []
): TreeNode {
  const node: TreeNode = {
    type: 'group',
    id: group.groupId,
    name: group.groupName,
    metadata: {
      propertyCount: properties.length,
    },
    children: [],
  };

  // Add properties first
  if (properties.length > 0) {
    node.children!.push(...properties.map(prop => formatPropertyNode(prop)));
  }

  // Then add child groups
  if (childGroups.length > 0) {
    node.children!.push(...childGroups);
  }

  return node;
}