// Parse Apprise URL and send notification
export async function sendAppriseNotification(
  appriseUrl: string,
  title: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Parse the Apprise URL scheme
    const urlMatch = appriseUrl.match(/^(\w+):\/\/(.+)$/);
    if (!urlMatch) {
      return { ok: false, error: "Invalid Apprise URL format" };
    }

    const [, scheme, rest] = urlMatch;

    switch (scheme.toLowerCase()) {
      case "ntfy":
      case "ntfys": {
        // ntfy://topic or ntfys://topic (secure) or ntfy://user:pass@host/topic
        const isSecure = scheme.toLowerCase() === "ntfys";
        let host = "ntfy.sh";
        let topic = rest;
        let auth: string | null = null;

        // Check for custom host: ntfy://host/topic or ntfy://user:pass@host/topic
        if (rest.includes("/")) {
          const parts = rest.split("/");
          const hostPart = parts[0];
          topic = parts.slice(1).join("/");

          if (hostPart.includes("@")) {
            const [credentials, hostName] = hostPart.split("@");
            auth = Buffer.from(credentials).toString("base64");
            host = hostName;
          } else {
            host = hostPart;
          }
        }

        const protocol = isSecure || host === "ntfy.sh" ? "https" : "http";
        const ntfyUrl = `${protocol}://${host}/${topic}`;

        const headers: Record<string, string> = {
          "Title": title,
          "Content-Type": "text/plain",
        };
        if (auth) {
          headers["Authorization"] = `Basic ${auth}`;
        }

        const response = await fetch(ntfyUrl, {
          method: "POST",
          headers,
          body: body,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          return { ok: false, error: `ntfy error: ${response.status} ${errorText}` };
        }
        return { ok: true };
      }

      case "tgram": {
        // tgram://bottoken/ChatID
        const parts = rest.split("/");
        if (parts.length < 2) {
          return { ok: false, error: "Invalid Telegram URL format. Use: tgram://bottoken/ChatID" };
        }
        const botToken = parts[0];
        const chatId = parts[1];

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `*${title}*\n\n${body}`,
            parse_mode: "Markdown",
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return { ok: false, error: `Telegram error: ${data.description || response.status}` };
        }
        return { ok: true };
      }

      case "discord": {
        // discord://webhook_id/webhook_token
        const parts = rest.replace(/\/$/, "").split("/");
        if (parts.length < 2) {
          return { ok: false, error: "Invalid Discord URL format. Use: discord://webhook_id/webhook_token" };
        }
        const webhookId = parts[0];
        const webhookToken = parts[1];

        const response = await fetch(`https://discord.com/api/webhooks/${webhookId}/${webhookToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{
              title: title,
              description: body,
              color: 0x3498db,
            }],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          return { ok: false, error: `Discord error: ${response.status} ${errorText}` };
        }
        return { ok: true };
      }

      case "slack": {
        // slack://TokenA/TokenB/TokenC
        const parts = rest.split("/");
        if (parts.length < 3) {
          return { ok: false, error: "Invalid Slack URL format. Use: slack://TokenA/TokenB/TokenC" };
        }
        const [tokenA, tokenB, tokenC] = parts;

        const response = await fetch(`https://hooks.slack.com/services/${tokenA}/${tokenB}/${tokenC}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `*${title}*\n${body}`,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          return { ok: false, error: `Slack error: ${response.status} ${errorText}` };
        }
        return { ok: true };
      }

      case "pushover": {
        // pushover://user_key@api_token
        const [userKey, apiToken] = rest.split("@");
        if (!userKey || !apiToken) {
          return { ok: false, error: "Invalid Pushover URL format. Use: pushover://user_key@api_token" };
        }

        const response = await fetch("https://api.pushover.net/1/messages.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: apiToken,
            user: userKey,
            title: title,
            message: body,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return { ok: false, error: `Pushover error: ${data.errors?.join(", ") || response.status}` };
        }
        return { ok: true };
      }

      case "http":
      case "https": {
        // Direct HTTP(S) webhook - treat as generic JSON POST
        const response = await fetch(appriseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, type: "info" }),
        });

        if (!response.ok) {
          return { ok: false, error: `HTTP error: ${response.status}` };
        }
        return { ok: true };
      }

      default:
        return { ok: false, error: `Unsupported notification scheme: ${scheme}. Supported: ntfy, tgram, discord, slack, pushover, http, https` };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}
