const generateWeeklyDigestHtml = (data) => {
    const {
        orgName,
        repoName,
        weekStart,
        weekEnd,
        metrics,
    } = data;

    const deploymentTrend = metrics.deployment_frequency?.trend_percent;
    const trendArrow = deploymentTrend > 0 ? '↑' : deploymentTrend < 0 ? '↓' : '→';
    const trendColor = deploymentTrend > 0 ? '#10b981' : deploymentTrend < 0 ? '#ef4444' : '#6b7280';

    const doraLevelColors = {
        elite: '#10b981',
        high: '#3b82f6',
        medium: '#f59e0b',
        low: '#ef4444',
        unknown: '#6b7280',
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: #1e293b; padding: 32px 40px; }
            .header-logo { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
            .logo-box { width: 28px; height: 28px; background: #6366f1; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; }
            .logo-text { color: #fff; font-size: 13px; font-weight: 700; }
            .header h1 { color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 4px; }
            .header p { color: #94a3b8; font-size: 14px; margin: 0; }
            .body { padding: 32px 40px; }
            .section-title { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px; }
            .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
            .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
            .metric-label { font-size: 12px; color: #64748b; margin: 0 0 4px; }
            .metric-value { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
            .metric-sub { font-size: 12px; color: #94a3b8; margin: 0; }
            .dora-level { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; color: #fff; margin-left: 6px; }
            .open-prs-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
            .open-prs-table th { text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; padding: 0 0 8px; border-bottom: 1px solid #e2e8f0; }
            .open-prs-table td { font-size: 13px; color: #374151; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .stale-badge { background: #fef3c7; color: #92400e; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
            .critical-badge { background: #fee2e2; color: #991b1b; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; }
            .footer p { font-size: 12px; color: #94a3b8; margin: 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-logo">
                    <div class="logo-box"><span class="logo-text">F</span></div>
                    <span style="color:#fff;font-size:14px;font-weight:600;">FlowMetrics</span>
                </div>
                <h1>Weekly Engineering Digest</h1>
                <p>${repoName} · ${weekStart} – ${weekEnd}</p>
            </div>

            <div class="body">
                <p class="section-title">DORA Metrics This Week</p>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <p class="metric-label">Deployment Frequency</p>
                        <p class="metric-value">
                            ${metrics.deployment_frequency?.deployments_per_week?.toFixed(1) || '—'}
                            <span style="font-size:14px;color:${trendColor};">${trendArrow}</span>
                        </p>
                        <p class="metric-sub">
                            deploys/week
                            <span class="dora-level" style="background:${doraLevelColors[metrics.deployment_frequency?.level || 'unknown']}">
                                ${metrics.deployment_frequency?.level || 'N/A'}
                            </span>
                        </p>
                    </div>
                    <div class="metric-card">
                        <p class="metric-label">Avg Lead Time</p>
                        <p class="metric-value">${metrics.lead_time?.avg_lead_time_hours?.toFixed(1) || metrics.lead_time?.avg_cycle_time_hours?.toFixed(1) || '—'}h</p>
                        <p class="metric-sub">
                            from first commit to merge
                            <span class="dora-level" style="background:${doraLevelColors[metrics.lead_time?.level || 'unknown']}">
                                ${metrics.lead_time?.level || 'N/A'}
                            </span>
                        </p>
                    </div>
                    <div class="metric-card">
                        <p class="metric-label">Change Failure Rate</p>
                        <p class="metric-value">${metrics.change_failure_rate?.failure_rate_percent?.toFixed(1) || '0'}%</p>
                        <p class="metric-sub">
                            of deployments failed
                            <span class="dora-level" style="background:${doraLevelColors[metrics.change_failure_rate?.level || 'unknown']}">
                                ${metrics.change_failure_rate?.level || 'N/A'}
                            </span>
                        </p>
                    </div>
                    <div class="metric-card">
                        <p class="metric-label">Mean Time to Recovery</p>
                        <p class="metric-value">${metrics.mean_time_to_recovery?.avg_mttr_hours?.toFixed(1) || '—'}h</p>
                        <p class="metric-sub">
                            avg recovery time
                            <span class="dora-level" style="background:${doraLevelColors[metrics.mean_time_to_recovery?.level || 'unknown']}">
                                ${metrics.mean_time_to_recovery?.level || 'N/A'}
                            </span>
                        </p>
                    </div>
                </div>

                ${metrics.open_prs && metrics.open_prs.length > 0 ? `
                <p class="section-title">PRs Needing Attention (${metrics.open_prs.length})</p>
                <table class="open-prs-table">
                    <thead>
                        <tr>
                            <th>PR</th>
                            <th>Author</th>
                            <th>Waiting</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${metrics.open_prs.slice(0, 5).map(pr => `
                        <tr>
                            <td>#${pr.number} ${pr.title.substring(0, 35)}${pr.title.length > 35 ? '...' : ''}</td>
                            <td>${pr.author_username}</td>
                            <td>${pr.waiting_hours}h</td>
                            <td>
                                ${pr.is_critical ? '<span class="critical-badge">Critical</span>' :
                                  pr.is_stale ? '<span class="stale-badge">Stale</span>' : '—'}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : ''}
            </div>

            <div class="footer">
                <p>FlowMetrics · Engineering Analytics for ${orgName}</p>
                <p style="margin-top:4px;">You're receiving this because you're an owner or admin of this organization.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { generateWeeklyDigestHtml };