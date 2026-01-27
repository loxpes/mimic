/**
 * Session Report Generator
 *
 * Generates comprehensive reports for completed testing sessions,
 * including executive summaries, findings analysis, and recommendations.
 */

import type {
  SessionReportData,
  GeneratedReport,
  FindingsSummary,
  Finding,
  FindingType,
  FindingSeverity,
  LLMConfig,
} from '@testfarm/shared';
import { LLMClient } from '../llm/client.js';

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generates a complete session report including LLM-powered summary and recommendations
 */
export async function generateSessionReport(
  data: SessionReportData,
  llmConfig: LLMConfig
): Promise<GeneratedReport> {
  // Calculate findings statistics
  const findingsSummary = calculateFindingsSummary(data.findings);

  // Generate LLM-powered content
  const llmClient = new LLMClient({ config: llmConfig });

  const [summary, recommendations] = await Promise.all([
    generateExecutiveSummary(data, findingsSummary, llmClient),
    generateRecommendations(data, findingsSummary, llmClient),
  ]);

  // Generate the full markdown report
  const markdownReport = generateMarkdownReport(data, findingsSummary, summary, recommendations);

  return {
    summary,
    findingsSummary,
    markdownReport,
    recommendations,
  };
}

/**
 * Generates a report without LLM calls (faster, for when LLM is unavailable)
 */
export function generateSessionReportBasic(data: SessionReportData): GeneratedReport {
  const findingsSummary = calculateFindingsSummary(data.findings);

  // Generate basic summary without LLM
  const summary = generateBasicSummary(data, findingsSummary);
  const recommendations = generateBasicRecommendations(findingsSummary);

  const markdownReport = generateMarkdownReport(data, findingsSummary, summary, recommendations);

  return {
    summary,
    findingsSummary,
    markdownReport,
    recommendations,
  };
}

// ============================================================================
// Findings Summary
// ============================================================================

function calculateFindingsSummary(findings: Finding[]): FindingsSummary {
  const byType: Record<FindingType, number> = {
    'ux-issue': 0,
    bug: 0,
    accessibility: 0,
    performance: 0,
    content: 0,
    'visual-design': 0,
  };

  const bySeverity: Record<FindingSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  let newFindings = 0;
  let duplicateFindings = 0;

  for (const finding of findings) {
    byType[finding.type]++;
    bySeverity[finding.severity]++;

    if (finding.isDuplicate) {
      duplicateFindings++;
    } else {
      newFindings++;
    }
  }

  return {
    total: findings.length,
    byType,
    bySeverity,
    newFindings,
    duplicateFindings,
  };
}

// ============================================================================
// LLM-Powered Generation
// ============================================================================

const REPORT_SYSTEM_PROMPT = `You are a QA analyst reviewing automated testing results.
Your task is to provide clear, actionable insights focused on user experience and technical issues.
Be concise but thorough. Prioritize critical issues.
Write in a professional tone suitable for stakeholders.`;

async function generateExecutiveSummary(
  data: SessionReportData,
  stats: FindingsSummary,
  llmClient: LLMClient
): Promise<string> {
  const prompt = `Analyze this testing session and provide a 2-3 sentence executive summary:

Session Details:
- Target URL: ${data.targetUrl}
- Persona: ${data.personaName}
- Objective: ${data.objectiveName}
- Duration: ${formatDuration(data.duration)}
- Outcome: ${data.outcome}

Findings Overview:
- Total findings: ${stats.total} (${stats.newFindings} new, ${stats.duplicateFindings} previously seen)
- Critical: ${stats.bySeverity.critical}
- High: ${stats.bySeverity.high}
- Medium: ${stats.bySeverity.medium}
- Low: ${stats.bySeverity.low}

By Type:
- UX Issues: ${stats.byType['ux-issue']}
- Bugs: ${stats.byType.bug}
- Accessibility: ${stats.byType.accessibility}
- Performance: ${stats.byType.performance}
- Content: ${stats.byType.content}
- Visual Design: ${stats.byType['visual-design']}

${
  data.findings.length > 0
    ? `Top Issues:\n${data.findings
        .slice(0, 5)
        .map((f) => `- [${f.severity}] ${f.description}`)
        .join('\n')}`
    : 'No issues were found during this session.'
}

Provide a concise executive summary (2-3 sentences) that highlights the key takeaways:`;

  try {
    return await llmClient.complete(prompt, REPORT_SYSTEM_PROMPT);
  } catch (error) {
    // Fallback to basic summary if LLM fails
    return generateBasicSummary(data, stats);
  }
}

async function generateRecommendations(
  data: SessionReportData,
  stats: FindingsSummary,
  llmClient: LLMClient
): Promise<string[]> {
  if (stats.total === 0) {
    return ['Continue monitoring for potential issues', 'Consider expanding test coverage to other user journeys'];
  }

  const findingsDescription = data.findings
    .slice(0, 10)
    .map((f) => `- [${f.type}/${f.severity}] ${f.description}`)
    .join('\n');

  const prompt = `Based on the testing session findings, provide 3-5 prioritized recommendations:

Session: ${data.personaName} testing ${data.targetUrl}
Outcome: ${data.outcome}

Findings (${stats.total} total, ${stats.newFindings} new):
${findingsDescription}

Severity breakdown:
- Critical: ${stats.bySeverity.critical}
- High: ${stats.bySeverity.high}
- Medium: ${stats.bySeverity.medium}
- Low: ${stats.bySeverity.low}

Provide 3-5 actionable recommendations as a numbered list. Each recommendation should be specific and actionable. Format as:
1. First recommendation
2. Second recommendation
(etc.)`;

  try {
    const response = await llmClient.complete(prompt, REPORT_SYSTEM_PROMPT);
    return parseRecommendations(response);
  } catch (error) {
    // Fallback to basic recommendations if LLM fails
    return generateBasicRecommendations(stats);
  }
}

function parseRecommendations(text: string): string[] {
  // Parse numbered list from LLM response
  const lines = text.split('\n').filter((line) => line.trim());
  const recommendations: string[] = [];

  for (const line of lines) {
    // Match lines starting with numbers or bullets
    const match = line.match(/^\s*(?:\d+[\.\):]?\s*|[-•*]\s*)(.+)/);
    if (match) {
      recommendations.push(match[1].trim());
    }
  }

  // If no numbered items found, split by sentences
  if (recommendations.length === 0) {
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 5);
  }

  return recommendations.slice(0, 5);
}

// ============================================================================
// Basic Generation (No LLM)
// ============================================================================

function generateBasicSummary(data: SessionReportData, stats: FindingsSummary): string {
  const outcomeText =
    data.outcome === 'completed'
      ? 'completed successfully'
      : data.outcome === 'blocked'
        ? 'was blocked before completion'
        : `ended with status: ${data.outcome}`;

  if (stats.total === 0) {
    return `Testing session with persona "${data.personaName}" on ${data.targetUrl} ${outcomeText}. No issues were identified during the ${formatDuration(data.duration)} session.`;
  }

  const criticalHighCount = stats.bySeverity.critical + stats.bySeverity.high;
  const severityNote =
    criticalHighCount > 0
      ? `${criticalHighCount} critical/high severity issues require immediate attention.`
      : 'All issues are of medium or low severity.';

  return `Testing session with persona "${data.personaName}" on ${data.targetUrl} ${outcomeText}, identifying ${stats.total} issues (${stats.newFindings} new). ${severityNote}`;
}

function generateBasicRecommendations(stats: FindingsSummary): string[] {
  const recommendations: string[] = [];

  if (stats.bySeverity.critical > 0) {
    recommendations.push(
      `Address ${stats.bySeverity.critical} critical issue(s) immediately as they may block user workflows`
    );
  }

  if (stats.bySeverity.high > 0) {
    recommendations.push(
      `Prioritize fixing ${stats.bySeverity.high} high-severity issue(s) in the next sprint`
    );
  }

  if (stats.byType['ux-issue'] > 0) {
    recommendations.push(
      `Review ${stats.byType['ux-issue']} UX issue(s) with the design team for potential improvements`
    );
  }

  if (stats.byType.accessibility > 0) {
    recommendations.push(
      `Conduct accessibility audit to address ${stats.byType.accessibility} accessibility concern(s)`
    );
  }

  if (stats.byType['visual-design'] > 0) {
    recommendations.push(
      `Review ${stats.byType['visual-design']} visual design issue(s) with the design team for UI/style improvements`
    );
  }

  if (stats.duplicateFindings > 0) {
    recommendations.push(
      `${stats.duplicateFindings} previously identified issue(s) persist - consider escalating their priority`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring for potential issues');
    recommendations.push('Consider expanding test coverage to other user journeys');
  }

  return recommendations.slice(0, 5);
}

// ============================================================================
// Markdown Report
// ============================================================================

function generateMarkdownReport(
  data: SessionReportData,
  stats: FindingsSummary,
  summary: string,
  recommendations: string[]
): string {
  const timestamp = new Date().toISOString();

  let report = `# Session Report: ${data.targetUrl}

> Generated: ${timestamp}

## Executive Summary

${summary}

## Session Details

| Metric | Value |
|--------|-------|
| **Target URL** | ${data.targetUrl} |
| **Persona** | ${data.personaName} |
| **Objective** | ${data.objectiveName} |
| **Duration** | ${formatDuration(data.duration)} |
| **Outcome** | ${capitalizeFirst(data.outcome)} |
| **Total Actions** | ${data.metrics.totalActions} |
| **Pages Visited** | ${data.metrics.pagesVisited} |
| **Success Rate** | ${calculateSuccessRate(data.metrics)}% |

## Findings Summary

### Overview

- **Total Findings**: ${stats.total}
- **New Findings**: ${stats.newFindings}
- **Previously Seen**: ${stats.duplicateFindings}

### By Severity

| Severity | Count |
|----------|-------|
| Critical | ${stats.bySeverity.critical} |
| High | ${stats.bySeverity.high} |
| Medium | ${stats.bySeverity.medium} |
| Low | ${stats.bySeverity.low} |

### By Type

| Type | Count |
|------|-------|
| UX Issues | ${stats.byType['ux-issue']} |
| Bugs | ${stats.byType.bug} |
| Accessibility | ${stats.byType.accessibility} |
| Performance | ${stats.byType.performance} |
| Content | ${stats.byType.content} |
| Visual Design | ${stats.byType['visual-design']} |

`;

  // Add detailed findings
  if (data.findings.length > 0) {
    report += `## Detailed Findings

`;

    // Sort by severity (critical first)
    const sortedFindings = [...data.findings].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    sortedFindings.forEach((finding, index) => {
      const duplicateNote = finding.isDuplicate ? ' *(Previously reported)*' : '';
      report += `### ${index + 1}. ${finding.description}${duplicateNote}

- **Type**: ${finding.type}
- **Severity**: ${finding.severity}
- **URL**: ${finding.url}
- **Persona Perspective**: *"${finding.personaPerspective}"*

`;
    });
  }

  // Add recommendations
  report += `## Recommendations

${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

*Report generated automatically by TestFarm*
`;

  return report;
}

// ============================================================================
// Utilities
// ============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${seconds} seconds`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculateSuccessRate(metrics: SessionReportData['metrics']): number {
  if (metrics.totalActions === 0) return 100;
  return Math.round((metrics.successfulActions / metrics.totalActions) * 100);
}
