const { getStore } = require("@netlify/blobs");

const store = getStore({ name: "site" });

exports.handler = async (event) => {
  if (!store) {
    return {
      statusCode: 500,
      body: "Blob store unavailable",
    };
  }

  const key = event.queryStringParameters && event.queryStringParameters.key;
  if (!key) {
    return {
      statusCode: 400,
      body: "Missing key",
    };
  }

  try {
    const blob = await store.get(key);

    if (!blob) {
      return {
        statusCode: 404,
        body: "Not found",
      };
    }

    const headers = {
      "Cache-Control": "public, max-age=86400",
    };

    if (blob.httpMetadata && blob.httpMetadata.contentType) {
      headers["Content-Type"] = blob.httpMetadata.contentType;
    }

    if (blob.encoding === "base64") {
      return {
        statusCode: 200,
        headers,
        body: blob.body,
        isBase64Encoded: true,
      };
    }

    if (Buffer.isBuffer(blob.body)) {
      return {
        statusCode: 200,
        headers,
        body: blob.body.toString("base64"),
        isBase64Encoded: true,
      };
    }

    return {
      statusCode: 200,
      headers,
      body: String(blob.body),
    };
  } catch (error) {
    console.error("blob-proxy error", error);
    return {
      statusCode: 500,
      body: "Blob read error",
    };
  }
};
