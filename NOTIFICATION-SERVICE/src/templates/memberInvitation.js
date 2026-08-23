const generateMemberInvitationHtml = (data) => {
    const { orgName, inviterName, role, token, expiresAt } = data;
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
    const acceptUrl = `${clientUrl.replace(/\/$/, '')}/invitations/${token}/accept`;
    const formattedExpiry = expiresAt ? new Date(expiresAt).toLocaleDateString() : '7 days';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #f8fafc; }
            .wrapper { max-width: 560px; margin: 40px auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px; text-align: center; }
            .header h1 { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px; }
            .header p { color: rgba(255, 255, 255, 0.85); font-size: 14px; margin: 0; }
            .content { padding: 32px; }
            .message { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
            .highlight { color: #818cf8; font-weight: 600; }
            .badge-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center; }
            .badge-box p { margin: 4px 0; font-size: 13px; color: #94a3b8; }
            .badge-box strong { color: #f8fafc; font-size: 14px; }
            .cta-container { text-align: center; margin: 32px 0 16px; }
            .cta-button { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
            .footer { padding: 24px 32px; background: #0f172a; border-top: 1px solid #334155; text-align: center; }
            .footer p { font-size: 12px; color: #64748b; margin: 0; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <h1>FlowMetrics Invitation</h1>
                <p>Collaborate with your engineering team</p>
            </div>
            <div class="content">
                <p class="message">
                    Hello,<br><br>
                    <span class="highlight">${inviterName}</span> has invited you to join <span class="highlight">${orgName}</span> on FlowMetrics as a <strong>${role}</strong>.
                </p>
                <div class="badge-box">
                    <p>Organization: <strong>${orgName}</strong></p>
                    <p>Role: <strong>${role.toUpperCase()}</strong></p>
                    <p>Expires: <strong>${formattedExpiry}</strong></p>
                </div>
                <div class="cta-container">
                    <a href="${acceptUrl}" class="cta-button">Accept Invitation</a>
                </div>
                <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 24px;">
                    Or paste this URL into your browser: <br>
                    <a href="${acceptUrl}" style="color: #818cf8; word-break: break-all;">${acceptUrl}</a>
                </p>
            </div>
            <div class="footer">
                <p>FlowMetrics · Developer Analytics Platform</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { generateMemberInvitationHtml };
