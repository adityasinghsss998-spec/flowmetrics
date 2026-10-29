// The summary text is written by an AI model, so we never put it into the email as raw HTML.
// Characters like < and & could break the layout or inject unwanted content.
const escapeHtml = (text) => {
    let safeText = String(text);

    // The & must be replaced FIRST. If we did it last, it would also
    // change the & inside the other replacements (like &lt;).
    safeText = safeText.replace(/&/g, '&amp;');
    safeText = safeText.replace(/</g, '&lt;');
    safeText = safeText.replace(/>/g, '&gt;');
    safeText = safeText.replace(/"/g, '&quot;');

    return safeText;
};

// Turns the plain-text summary into HTML paragraphs.
const narrativeToParagraphs = (narrative) => {
    const blocks = String(narrative).trim().split(/\n\s*\n/);

    let html = '';
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i].trim();
        if (block === '') {
            continue;
        }

        const safeBlock = escapeHtml(block);
        // A single line break inside a paragraph becomes <br>.
        const blockWithBreaks = safeBlock.replace(/\n/g, '<br>');
        html += `<p style="margin: 0 0 16px 0; line-height: 1.6;">${blockWithBreaks}</p>`;
    }

    return html;
};

const generateAiDigestHtml = ({ orgName, repoName, narrative, generatedAt }) => {
    let teamName = 'your team';
    if (orgName) {
        teamName = orgName;
    }

    let repository = 'your repository';
    if (repoName) {
        repository = repoName;
    }

    let dateText = '';
    if (generatedAt) {
        const date = new Date(generatedAt);
        // An invalid date has no valid time value, so we skip showing it.
        if (!isNaN(date.getTime())) {
            dateText = ' · ' + date.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
            });
        }
    }

    const safeTeam = escapeHtml(teamName);
    const safeRepository = escapeHtml(repository);
    const bodyHtml = narrativeToParagraphs(narrative);

    return `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 24px; background: #f4f5f7; font-family: Arial, Helvetica, sans-serif; color: #1f2933;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
    <h2 style="margin: 0 0 4px 0;">Weekly engineering summary</h2>
    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">${safeTeam} · ${safeRepository}${dateText}</p>
    ${bodyHtml}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
      Written by the FlowMetrics AI analyst from your repository data. Check your dashboard for exact numbers.
    </p>
  </div>
</body>
</html>`;
};

module.exports = { generateAiDigestHtml };