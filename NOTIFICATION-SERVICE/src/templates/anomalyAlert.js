const generateAnomalyAlertHtml = (data) => {
    const { repoName, anomalyType, description, currentValue, threshold, detectedAt } = data;

    const severityColors = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#3b82f6',
    };

    const severityLabels = {
        cycle_time_spike: { label: 'Cycle Time Spike', severity: 'high' },
        deployment_failure: { label: 'Deployment Failure Rate', severity: 'critical' },
        stale_prs: { label: 'Stale Pull Requests', severity: 'medium' },
        no_deployments: { label: 'No Deployments Detected', severity: 'low' },
    };

    const anomalyInfo = severityLabels[anomalyType] || {
        label: 'Anomaly Detected',
        severity: 'medium',
    };

    const color = severityColors[anomalyInfo.severity];

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f8fafc; }
            .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
            .alert-banner { background: ${color}; padding: 20px 32px; }
            .alert-banner h2 { color: #fff; font-size: 16px; font-weight: 600; margin: 0 0 4px; }
            .alert-banner p { color: rgba(255,255,255,0.85); font-size: 13px; margin: 0; }
            .body { padding: 32px; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
            .detail-label { font-size: 13px; color: #64748b; }
            .detail-value { font-size: 13px; font-weight: 600; color: #1e293b; }
            .description-box { background: #f8fafc; border-left: 3px solid ${color}; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0; }
            .description-box p { font-size: 14px; color: #374151; margin: 0; line-height: 1.6; }
            .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
            .footer p { font-size: 12px; color: #94a3b8; margin: 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="alert-banner">
                <h2>⚠ ${anomalyInfo.label}</h2>
                <p>${repoName} · ${new Date(detectedAt).toLocaleString()}</p>
            </div>
            <div class="body">
                <div class="description-box">
                    <p>${description}</p>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Repository</span>
                    <span class="detail-value">${repoName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Current Value</span>
                    <span class="detail-value" style="color:${color}">${currentValue}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Threshold</span>
                    <span class="detail-value">${threshold}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Severity</span>
                    <span class="detail-value" style="color:${color}">${anomalyInfo.severity.toUpperCase()}</span>
                </div>
            </div>
            <div class="footer">
                <p>FlowMetrics Anomaly Detection · This alert was triggered automatically.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { generateAnomalyAlertHtml };