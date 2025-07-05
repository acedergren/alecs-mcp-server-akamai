import axios, { AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';

// API Response Schemas
const SonarCloudIssueSchema = z.object({
  key: z.string(),
  rule: z.string(),
  severity: z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO']),
  component: z.string(),
  project: z.string(),
  line: z.number().optional(),
  hash: z.string().optional(),
  textRange: z.object({
    startLine: z.number(),
    endLine: z.number(),
    startOffset: z.number(),
    endOffset: z.number(),
  }).optional(),
  flows: z.array(z.any()).optional(),
  status: z.enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED']),
  message: z.string(),
  effort: z.string().optional(),
  debt: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()),
  creationDate: z.string(),
  updateDate: z.string(),
  type: z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']),
  organization: z.string().optional(),
  cleanCodeAttribute: z.string().optional(),
  cleanCodeAttributeCategory: z.string().optional(),
  impacts: z.array(z.object({
    softwareQuality: z.string(),
    severity: z.string(),
  })).optional(),
});

const SonarCloudComponentSchema = z.object({
  key: z.string(),
  name: z.string(),
  qualifier: z.string(),
  path: z.string().optional(),
  language: z.string().optional(),
});

const SonarCloudRuleSchema = z.object({
  key: z.string(),
  name: z.string(),
  lang: z.string().optional(),
  langName: z.string().optional(),
});

const IssuesResponseSchema = z.object({
  issues: z.array(SonarCloudIssueSchema),
  components: z.array(SonarCloudComponentSchema),
  rules: z.array(SonarCloudRuleSchema).optional(),
  facets: z.array(z.any()).optional(),
  paging: z.object({
    pageIndex: z.number(),
    pageSize: z.number(),
    total: z.number(),
  }),
});

const QualityGateStatusSchema = z.object({
  projectStatus: z.object({
    status: z.enum(['OK', 'WARN', 'ERROR', 'NONE']),
    conditions: z.array(z.object({
      status: z.enum(['OK', 'WARN', 'ERROR', 'NO_VALUE']),
      metricKey: z.string(),
      comparator: z.string(),
      periodIndex: z.number().optional(),
      errorThreshold: z.string().optional(),
      warningThreshold: z.string().optional(),
      actualValue: z.string().optional(),
    })),
    periods: z.array(z.any()).optional(),
    ignoredConditions: z.boolean().optional(),
  }),
});

const MeasuresResponseSchema = z.object({
  component: z.object({
    key: z.string(),
    name: z.string(),
    qualifier: z.string(),
    measures: z.array(z.object({
      metric: z.string(),
      value: z.string().optional(),
      periods: z.array(z.object({
        index: z.number(),
        value: z.string(),
      })).optional(),
      bestValue: z.boolean().optional(),
    })),
  }),
});

const ProjectSearchResponseSchema = z.object({
  components: z.array(z.object({
    key: z.string(),
    name: z.string(),
    qualifier: z.string(),
    visibility: z.string().optional(),
    lastAnalysisDate: z.string().optional(),
    revision: z.string().optional(),
  })),
  paging: z.object({
    pageIndex: z.number(),
    pageSize: z.number(),
    total: z.number(),
  }),
});

// Type exports
export type SonarCloudIssue = z.infer<typeof SonarCloudIssueSchema>;
export type IssuesResponse = z.infer<typeof IssuesResponseSchema>;
export type QualityGateStatus = z.infer<typeof QualityGateStatusSchema>;
export type MeasuresResponse = z.infer<typeof MeasuresResponseSchema>;
export type ProjectSearchResponse = z.infer<typeof ProjectSearchResponseSchema>;

export interface SonarCloudConfig {
  organization: string;
  token: string;
  baseUrl?: string;
}

export class SonarCloudClient {
  private client: AxiosInstance;
  private organization: string;

  constructor(config: SonarCloudConfig) {
    this.organization = config.organization;
    
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://sonarcloud.io/api',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response) {
          const message = error.response.data && typeof error.response.data === 'object' && 'errors' in error.response.data
            ? (error.response.data as { errors: Array<{ msg: string }> }).errors[0]?.msg || error.message
            : error.message;
          
          throw new Error(`SonarCloud API Error: ${message} (Status: ${error.response.status})`);
        }
        throw error;
      }
    );
  }

  /**
   * Fetch all issues for a project
   */
  async getIssues(projectKey: string, options?: {
    statuses?: Array<'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED'>;
    severities?: Array<'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO'>;
    types?: Array<'CODE_SMELL' | 'BUG' | 'VULNERABILITY' | 'SECURITY_HOTSPOT'>;
    page?: number;
    pageSize?: number;
  }): Promise<IssuesResponse> {
    const params: Record<string, string> = {
      componentKeys: projectKey,
      organization: this.organization,
      ps: String(options?.pageSize || 100),
      p: String(options?.page || 1),
    };

    if (options?.statuses?.length) {
      params['statuses'] = options.statuses.join(',');
    }
    if (options?.severities?.length) {
      params['severities'] = options.severities.join(',');
    }
    if (options?.types?.length) {
      params['types'] = options.types.join(',');
    }

    const response = await this.client.get('/issues/search', { params });
    return IssuesResponseSchema.parse(response.data);
  }

  /**
   * Get all issues (paginated)
   */
  async getAllIssues(projectKey: string, options?: {
    statuses?: Array<'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED'>;
  }): Promise<SonarCloudIssue[]> {
    const allIssues: SonarCloudIssue[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getIssues(projectKey, {
        ...options,
        page,
        pageSize: 500, // Max page size
      });

      allIssues.push(...response.issues);
      
      const totalPages = Math.ceil(response.paging.total / response.paging.pageSize);
      hasMore = page < totalPages;
      page++;
    }

    return allIssues;
  }

  /**
   * Update issue status
   */
  async updateIssueStatus(issueKey: string, transition: 'confirm' | 'resolve' | 'falsepositive' | 'wontfix' | 'reopen'): Promise<void> {
    await this.client.post('/issues/do_transition', null, {
      params: {
        issue: issueKey,
        transition,
      },
    });
  }

  /**
   * Bulk update issue statuses
   */
  async bulkUpdateIssueStatus(issueKeys: string[], transition: 'confirm' | 'resolve' | 'falsepositive' | 'wontfix' | 'reopen'): Promise<void> {
    await this.client.post('/issues/bulk_change', null, {
      params: {
        issues: issueKeys.join(','),
        do_transition: transition,
      },
    });
  }

  /**
   * Get project quality gate status
   */
  async getQualityGateStatus(projectKey: string): Promise<QualityGateStatus> {
    const response = await this.client.get('/qualitygates/project_status', {
      params: {
        projectKey,
        organization: this.organization,
      },
    });
    return QualityGateStatusSchema.parse(response.data);
  }

  /**
   * Get project measures/metrics
   */
  async getMeasures(projectKey: string, metricKeys: string[]): Promise<MeasuresResponse> {
    const response = await this.client.get('/measures/component', {
      params: {
        component: projectKey,
        metricKeys: metricKeys.join(','),
        organization: this.organization,
      },
    });
    return MeasuresResponseSchema.parse(response.data);
  }

  /**
   * Search for projects
   */
  async searchProjects(query?: string): Promise<ProjectSearchResponse> {
    const params: Record<string, string> = {
      organization: this.organization,
      ps: '100',
    };

    if (query) {
      params['q'] = query;
    }

    const response = await this.client.get('/components/search', {
      params,
    });
    return ProjectSearchResponseSchema.parse(response.data);
  }

  /**
   * Trigger project analysis (requires CI/CD integration)
   */
  async getAnalysisInstructions(projectKey: string): Promise<{
    scanner: string;
    properties: Record<string, string>;
  }> {
    return {
      scanner: 'sonar-scanner',
      properties: {
        'sonar.projectKey': projectKey,
        'sonar.organization': this.organization,
        'sonar.sources': 'src',
        'sonar.exclusions': 'node_modules/**,dist/**,build/**,**/*.test.ts,**/*.spec.ts',
        'sonar.tests': 'src/__tests__',
        'sonar.test.inclusions': '**/*.test.ts,**/*.spec.ts',
        'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
        'sonar.typescript.lcov.reportPaths': 'coverage/lcov.info',
        'sonar.host.url': 'https://sonarcloud.io',
      },
    };
  }

  /**
   * Get project activity (analysis history)
   */
  async getProjectActivity(projectKey: string, options?: {
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const params: Record<string, string> = {
      component: projectKey,
      ps: String(options?.pageSize || 100),
      p: String(options?.page || 1),
    };

    if (options?.from) {params['from'] = options.from;}
    if (options?.to) {params['to'] = options.to;}

    const response = await this.client.get('/project_analyses/search', { params });
    return response.data;
  }
}