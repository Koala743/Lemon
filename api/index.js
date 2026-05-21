const { verifyKey } = require("discord-interactions");

// Verify Discord signature
async function verifyDiscordRequest(req) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const body = await buffer(req);

  const isValid = verifyKey(body, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  return { isValid, body };
}

// Read raw body as buffer
function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Search Wikipedia
async function searchWikipedia(query) {
  const searchUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl);

  if (!res.ok) {
    // Try search endpoint if direct lookup fails
    const searchRes = await fetch(
      `https://es.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json`
    );
    const searchData = await searchRes.json();
    if (searchData[1].length === 0) return null;

    const title = searchData[1][0];
    const summaryRes = await fetch(
      `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!summaryRes.ok) return null;
    return await summaryRes.json();
  }

  return await res.json();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // Verify the request is from Discord
  const { isValid, body } = await verifyDiscordRequest(req);
  if (!isValid) {
    return res.status(401).send("Invalid request signature");
  }

  const interaction = JSON.parse(body.toString());

  // Discord PING verification
  if (interaction.type === 1) {
    return res.json({ type: 1 });
  }

  // Slash command handler
  if (interaction.type === 2) {
    const commandName = interaction.data.name;

    if (commandName === "wikipedia") {
      const query = interaction.data.options[0].value;

      try {
        const data = await searchWikipedia(query);

        if (!data || !data.extract) {
          return res.json({
            type: 4,
            data: {
              content: `❌ No encontré nada en Wikipedia sobre **${query}**. Intenta con otro término.`,
            },
          });
        }

        // Trim extract to fit Discord's 2000 char limit
        const extract =
          data.extract.length > 1500
            ? data.extract.substring(0, 1500) + "..."
            : data.extract;

        return res.json({
          type: 4,
          data: {
            embeds: [
              {
                title: data.title,
                description: extract,
                url: data.content_urls?.desktop?.page || "",
                color: 0x3b82f6,
                thumbnail: data.thumbnail
                  ? { url: data.thumbnail.source }
                  : undefined,
                footer: {
                  text: "Wikipedia",
                  icon_url:
                    "https://es.wikipedia.org/static/favicon/wikipedia.ico",
                },
              },
            ],
          },
        });
      } catch (err) {
        return res.json({
          type: 4,
          data: {
            content: `❌ Error al buscar en Wikipedia. Intenta de nuevo.`,
          },
        });
      }
    }
  }

  return res.status(400).send("Unknown interaction type");
};
