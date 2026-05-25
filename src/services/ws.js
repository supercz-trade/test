// src/services/ws.js
// Global WebSocket client — single connection for the entire app

const WS_URL =
  import.meta.env.VITE_WS_URL
  || "ws://localhost:3001/ws";

// INTERNAL STATE

let ws = null;

let reconnectTimer = null;

let pingInterval = null;

let reconnectAttempts = 0;

const listeners = new Map(); // channel -> Set<callback>

// SAFE SEND

// [ADDED]
function safeSend(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("[WS] send skipped — socket not open");
    return false;
  }
  if (!payload || (!payload.action && !payload.channel)) {
    console.warn("[WS] send skipped — missing action or channel", payload);
    return false;
  }
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error("[WS] send error:", err);
    return false;
  }
}

// CLEANUP

// [ADDED]
function cleanupSocket() {

  clearInterval(pingInterval);

  pingInterval = null;

  if (ws) {

    try {

      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;

    } catch {}
  }

  ws = null;
}

// CONNECT

function connect() {

  // PREVENT DUPLICATE CONNECTION

  if (
    ws &&
    (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    )
  ) {

    return;
  }

  console.log(
    "[WS] connecting to",
    WS_URL
  );

  try {

    ws = new WebSocket(WS_URL);

  } catch (err) {

    console.error(
      "[WS] failed to create websocket:",
      err
    );

    return;
  }

  // OPEN

  ws.onopen = () => {

    console.log("[WS] connected");

    reconnectAttempts = 0;

    // SAFETY CHECK

    if (
      !ws ||
      ws.readyState !== WebSocket.OPEN
    ) {

      console.warn(
        "[WS] invalid socket state on open"
      );

      return;
    }

    // RESUBSCRIBE CHANNELS

    for (const channel of listeners.keys()) {

      safeSend({
        action: "subscribe",
        channel
      });
    }

    // HEARTBEAT

    clearInterval(pingInterval);

    pingInterval = setInterval(() => {

      if (
        ws &&
        ws.readyState === WebSocket.OPEN
      ) {

        safeSend({
          action: "ping"
        });
      }

    }, 30000);
  };

  // MESSAGE

  ws.onmessage = (event) => {

    try {

      const msg =
        JSON.parse(event.data);

      // INVALID

      if (
        !msg ||
        typeof msg !== "object"
      ) {

        return;
      }

      // HEARTBEAT

      if (msg.action === "pong") {

        return;
      }

      // CONNECTED

      if (msg.action === "connected") {

        console.log(
          "[WS] server connected message"
        );

        return;
      }

      // SUBSCRIBE SUCCESS

      if (msg.ok === true) {

        console.log(
          "[WS]",
          msg.action,
          msg.channel
        );

        return;
      }

      // SERVER ERROR

      if (msg.error) {

        console.error(
          "[WS] server error:",
          msg.error
        );

        return;
      }

      // CHANNEL

      const channel =
        msg.channel;

      if (!channel) {

        return;
      }

      // PAYLOAD

      let payload =
        msg.data;

      // fallback legacy format
      if (payload === undefined) {

        const {
          channel: _ch,
          ts: _ts,
          action: _ac,
          ok: _ok,
          error: _er,
          ...rest
        } = msg;

        payload = rest;
      }

      // VALIDATE PAYLOAD

      if (
        !payload ||
        typeof payload !== "object"
      ) {

        console.warn(
          "[WS] invalid payload:",
          payload
        );

        return;
      }

      // CALLBACKS

      const callbacks =
        listeners.get(channel);

      if (
        !callbacks ||
        callbacks.size === 0
      ) {

        return;
      }

      for (const cb of callbacks) {

        try {

          cb(payload);

        } catch (err) {

          console.error(
            "[WS] listener error:",
            err
          );
        }
      }

    } catch (err) {

      console.error(
        "[WS] parse error:",
        err
      );
    }
  };

  // CLOSE

  ws.onclose = (event) => {

    console.warn(
      "[WS] disconnected",
      {
        code: event.code,
        reason: event.reason
      }
    );

    cleanupSocket();

    // AUTO RECONNECT

    if (
      listeners.size > 0 &&
      !reconnectTimer
    ) {

      reconnectAttempts++;

      const delay =
        Math.min(
          3000 * reconnectAttempts,
          15000
        );

      console.log(
        `[WS] reconnecting in ${delay}ms`
      );

      reconnectTimer = setTimeout(() => {

        reconnectTimer = null;

        connect();

      }, delay);
    }
  };

  // ERROR

  ws.onerror = (err) => {

    console.error(
      "[WS] connection error",
      err
    );
  };
}

// SUBSCRIBE

export function subscribeChannel(
  channel,
  callback
) {

  // VALIDATE

  if (
    !channel ||
    typeof channel !== "string"
  ) {

    console.error(
      "[WS] invalid channel"
    );

    return () => {};
  }

  if (
    typeof callback !== "function"
  ) {

    console.error(
      "[WS] callback must be function"
    );

    return () => {};
  }

  // CREATE CHANNEL SET

  if (!listeners.has(channel)) {

    listeners.set(
      channel,
      new Set()
    );

    // subscribe immediately if connected
    if (
      ws &&
      ws.readyState === WebSocket.OPEN
    ) {

      safeSend({
        action: "subscribe",
        channel
      });

    } else {

      connect();
    }
  }

  // ADD CALLBACK

  listeners
    .get(channel)
    .add(callback);

  // UNSUBSCRIBE FUNCTION

  return () => {

    const callbacks =
      listeners.get(channel);

    if (!callbacks) {

      return;
    }

    callbacks.delete(callback);

    // REMOVE EMPTY CHANNEL

    if (callbacks.size === 0) {

      listeners.delete(channel);

      if (
        ws &&
        ws.readyState === WebSocket.OPEN
      ) {

        safeSend({
          action: "unsubscribe",
          channel
        });
      }
    }

    // CLOSE IF NO LISTENERS

    if (
      listeners.size === 0 &&
      ws
    ) {

      try {

        ws.close();

      } catch (err) {

        console.error(
          "[WS] close error:",
          err
        );
      }

      cleanupSocket();
    }
  };
}

// PREDEFINED SUBSCRIPTIONS

export function subscribeTransactions(
  callback
) {

  return subscribeChannel(
    "transaction:all",
    callback
  );
}

export function subscribeNewToken(
  callback
) {

  return subscribeChannel(
    "new_token",
    callback
  );
}

export function subscribeTokenUpdate(
  callback
) {

  return subscribeChannel(
    "token_update",
    callback
  );
}

export function subscribeMigrate(
  callback
) {

  return subscribeChannel(
    "migrate",
    callback
  );
}

export function subscribeTokenTransactions(
  tokenAddress,
  callback
) {

  if (!tokenAddress) {

    console.error(
      "[WS] tokenAddress required"
    );

    return () => {};
  }

  return subscribeChannel(
    `transaction:${tokenAddress.toLowerCase()}`,
    callback
  );
}

export function subscribeHolderUpdate(
  tokenAddress,
  callback
) {

  if (!tokenAddress) {

    console.error(
      "[WS] tokenAddress required"
    );

    return () => {};
  }

  return subscribeChannel(
    `holder:${tokenAddress.toLowerCase()}`,
    callback
  );
}

// src/services/ws.js (tambahkan di bagian PREDEFINED SUBSCRIPTIONS)

export function subscribeCandle(tokenAddress, callback) {
  if (!tokenAddress) {
    console.error("[WS] tokenAddress required for subscribeCandle");
    return () => {};
  }
  return subscribeChannel(`candle:${tokenAddress.toLowerCase()}`, callback);
}

// HELPERS

export function getWsState() {

  if (!ws) {

    return "CLOSED";
  }

  switch (ws.readyState) {

    case WebSocket.CONNECTING:
      return "CONNECTING";

    case WebSocket.OPEN:
      return "OPEN";

    case WebSocket.CLOSING:
      return "CLOSING";

    case WebSocket.CLOSED:
      return "CLOSED";

    default:
      return "UNKNOWN";
  }
}

export function isWsConnected() {

  return (
    ws &&
    ws.readyState === WebSocket.OPEN
  );
}