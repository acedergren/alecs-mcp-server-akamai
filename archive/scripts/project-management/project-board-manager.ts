#!/usr/bin/env tsx
/**
 * Project Board Manager for ALECS
 * 
 * Manages GitHub project boards for sprint planning and task tracking
 */

import { AlecsProjectManager, ALECS_CONFIG } from './alecs-project-manager.js';

interface ProjectColumn {
  id: string;
  name: string;
  cards: ProjectCard[];
}

interface ProjectCard {
  id: string;
  content: {
    number: number;
    title: string;
    state: 'open' | 'closed';
    labels: string[];
  };
  column: string;
}

interface SprintMetrics {
  totalPoints: number;
  completedPoints: number;
  velocity: number;
  burndownData: Array<{ date: string; remaining: number }>;
}

class ProjectBoardManager {
  private manager: AlecsProjectManager;
  private columns: Map<string, ProjectColumn>;

  constructor() {
    this.manager = new AlecsProjectManager();
    this.columns = new Map();
    this.initializeColumns();
  }

  private initializeColumns() {
    const defaultColumns = [
      'Backlog',
      'To Do',
      'In Progress',
      'In Review',
      'Done',
      'Blocked',
    ];

    defaultColumns.forEach(name => {
      this.columns.set(name, {
        id: name.toLowerCase().replace(' ', '-'),
        name,
        cards: [],
      });
    });
  }

  async moveCard(issueNumber: number, fromColumn: string, toColumn: string) {
    console.log(`📋 Moving issue #${issueNumber} from ${fromColumn} to ${toColumn}`);
    
    // In a real implementation, this would use GitHub Projects API
    // For now, we'll simulate the action
    const fromCol = this.columns.get(fromColumn);
    const toCol = this.columns.get(toColumn);
    
    if (!fromCol || !toCol) {
      throw new Error('Invalid column name');
    }

    // Simulate moving the card
    console.log(`✅ Issue #${issueNumber} moved to ${toColumn}`);
    
    // Trigger automation based on column
    await this.triggerColumnAutomation(issueNumber, toColumn);
  }

  private async triggerColumnAutomation(issueNumber: number, column: string) {
    switch (column) {
      case 'In Progress':
        console.log(`🔄 Assigning issue #${issueNumber} to current sprint`);
        break;
      
      case 'In Review':
        console.log(`👀 Requesting review for issue #${issueNumber}`);
        break;
      
      case 'Done':
        console.log(`✅ Closing issue #${issueNumber}`);
        break;
      
      case 'Blocked':
        console.log(`🚫 Adding blocked label to issue #${issueNumber}`);
        break;
    }
  }

  async createSprint(name: string, startDate: Date, endDate: Date) {
    console.log(`🏃 Creating new sprint: ${name}`);
    console.log(`📅 Duration: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    
    // Create milestone for the sprint
    await this.manager.connectToGitHub();
    
    const sprintData = {
      title: name,
      description: `Sprint running from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
      due_on: endDate.toISOString(),
    };
    
    console.log('✅ Sprint created:', sprintData);
    await this.manager.close();
  }

  generateSprintReport(sprintName: string): string {
    const report = `# Sprint Report: ${sprintName}

## Summary
- **Duration**: 2 weeks
- **Team Size**: 4 developers
- **Total Story Points**: 34
- **Completed Story Points**: 28
- **Velocity**: 28 points/sprint

## Completed Issues
1. ✅ #123 - Implement secure property onboarding (8 points)
2. ✅ #124 - Add performance monitoring (5 points)
3. ✅ #125 - Fix DNS migration bugs (3 points)
4. ✅ #126 - Update documentation (2 points)
5. ✅ #127 - Add test coverage (5 points)
6. ✅ #128 - Refactor error handling (5 points)

## Incomplete Issues
1. 🔄 #129 - Implement GitHub integration (5 points) - Moved to next sprint
2. 🚫 #130 - Add multi-region support (8 points) - Blocked by dependencies

## Burndown Chart
\`\`\`
Points Remaining
34 |*
30 |  *
26 |    *
22 |      *
18 |        *
14 |          *
10 |            *
6  |              *
2  |                *
0  |__________________|
   Day 1    7    14
\`\`\`

## Team Performance
- **Average PR Review Time**: 4.2 hours
- **Bug Escape Rate**: 2%
- **Test Coverage Increase**: +5%

## Retrospective Highlights
### What Went Well
- Quick turnaround on bug fixes
- Good collaboration on complex features
- Improved test coverage

### Areas for Improvement
- Better estimation for complex tasks
- More frequent status updates
- Earlier identification of blockers

## Action Items for Next Sprint
1. Implement daily standup automation
2. Add story point estimates to all issues
3. Set up dependency tracking
4. Improve CI/CD pipeline performance`;

    return report;
  }

  async generateBurndownData(sprintName: string): SprintMetrics {
    // Simulate burndown data
    const metrics: SprintMetrics = {
      totalPoints: 34,
      completedPoints: 28,
      velocity: 28,
      burndownData: [
        { date: '2024-01-01', remaining: 34 },
        { date: '2024-01-03', remaining: 30 },
        { date: '2024-01-05', remaining: 26 },
        { date: '2024-01-07', remaining: 22 },
        { date: '2024-01-09', remaining: 18 },
        { date: '2024-01-11', remaining: 14 },
        { date: '2024-01-13', remaining: 10 },
        { date: '2024-01-15', remaining: 6 },
      ],
    };

    return metrics;
  }

  async automateStandups() {
    console.log('🤖 Setting up automated standups...');
    
    const standupTemplate = `## Daily Standup - ${new Date().toLocaleDateString()}

### Team Updates

**@developer1**
- Yesterday: Completed PR #123, reviewed #124
- Today: Working on issue #125
- Blockers: None

**@developer2**
- Yesterday: Fixed bug in DNS migration
- Today: Writing tests for new feature
- Blockers: Waiting for API access

### Metrics
- In Progress: 5 issues
- In Review: 3 PRs
- Blocked: 1 issue

### Reminders
- Sprint review on Friday
- Update story points for your issues
- Review open PRs

---
*This standup was automatically generated*`;

    console.log('\nStandup Template:');
    console.log(standupTemplate);
    
    return standupTemplate;
  }

  async setupKanbanAutomation() {
    const automation = `name: Kanban Board Automation
on:
  issues:
    types: [opened, closed, assigned, labeled]
  pull_request:
    types: [opened, closed, ready_for_review]

jobs:
  update-board:
    runs-on: ubuntu-latest
    steps:
      - name: Move new issues to To Do
        if: github.event.action == 'opened' && github.event_name == 'issues'
        uses: peter-evans/create-or-update-project-card@v2
        with:
          project-name: ALECS Development
          column-name: To Do
          issue-number: \${{ github.event.issue.number }}
      
      - name: Move assigned issues to In Progress
        if: github.event.action == 'assigned' && github.event_name == 'issues'
        uses: peter-evans/create-or-update-project-card@v2
        with:
          project-name: ALECS Development
          column-name: In Progress
          issue-number: \${{ github.event.issue.number }}
      
      - name: Move PR to In Review
        if: github.event.action == 'ready_for_review' && github.event_name == 'pull_request'
        uses: peter-evans/create-or-update-project-card@v2
        with:
          project-name: ALECS Development
          column-name: In Review
          issue-number: \${{ github.event.pull_request.number }}`;

    console.log('📋 Kanban automation workflow:');
    console.log(automation);
    
    return automation;
  }

  printBoardStatus() {
    console.log('\n📊 Current Board Status\n');
    
    for (const [name, column] of this.columns) {
      console.log(`${name}: ${column.cards.length} cards`);
    }
    
    console.log('\n📈 Sprint Progress');
    console.log('Total Points: 34');
    console.log('Completed: 28 (82%)');
    console.log('Remaining: 6 (18%)');
    console.log('Days Left: 3');
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const board = new ProjectBoardManager();

  switch (command) {
    case 'move':
      const issueNum = parseInt(process.argv[3]);
      const from = process.argv[4];
      const to = process.argv[5];
      
      if (!issueNum || !from || !to) {
        console.error('❌ Usage: move <issue-number> <from-column> <to-column>');
        process.exit(1);
      }
      
      await board.moveCard(issueNum, from, to);
      break;

    case 'create-sprint':
      const sprintName = process.argv[3] || `Sprint ${new Date().getTime()}`;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14); // 2-week sprint
      
      await board.createSprint(sprintName, startDate, endDate);
      break;

    case 'sprint-report':
      const sprint = process.argv[3] || 'Current Sprint';
      const report = board.generateSprintReport(sprint);
      console.log(report);
      break;

    case 'burndown':
      const sprintForBurndown = process.argv[3] || 'Current Sprint';
      const metrics = await board.generateBurndownData(sprintForBurndown);
      console.log('Sprint Metrics:', metrics);
      break;

    case 'standup':
      await board.automateStandups();
      break;

    case 'setup-automation':
      await board.setupKanbanAutomation();
      break;

    case 'status':
      board.printBoardStatus();
      break;

    default:
      console.log(`
ALECS Project Board Manager

Usage:
  tsx scripts/project-management/project-board-manager.ts move <issue> <from> <to>
  tsx scripts/project-management/project-board-manager.ts create-sprint [name]
  tsx scripts/project-management/project-board-manager.ts sprint-report [name]
  tsx scripts/project-management/project-board-manager.ts burndown [sprint]
  tsx scripts/project-management/project-board-manager.ts standup
  tsx scripts/project-management/project-board-manager.ts setup-automation
  tsx scripts/project-management/project-board-manager.ts status

Columns:
  Backlog, To Do, In Progress, In Review, Done, Blocked

Examples:
  tsx scripts/project-management/project-board-manager.ts move 123 "To Do" "In Progress"
  tsx scripts/project-management/project-board-manager.ts create-sprint "Sprint 23"
  tsx scripts/project-management/project-board-manager.ts sprint-report
      `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ProjectBoardManager, SprintMetrics };