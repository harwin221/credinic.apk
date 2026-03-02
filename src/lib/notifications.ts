// Notification functions for Server-Sent Events
// This file is separate from the route to avoid Next.js export restrictions

// This will be populated by the SSE route when connections are established
let connections: Map<string, ReadableStreamDefaultController> | null = null;

export function setConnections(connectionsMap: Map<string, ReadableStreamDefaultController>) {
  connections = connectionsMap;
}

// Function to broadcast notifications to all connected users
export function broadcastNotification(notification: {
  type: string;
  message: string;
  data?: any;
  targetUsers?: string[];
}) {
  if (!connections) return;

  const message = `data: ${JSON.stringify({
    ...notification,
    timestamp: new Date().toISOString()
  })}\n\n`;

  for (const [userId, controller] of connections.entries()) {
    // If targetUsers is specified, only send to those users
    if (notification.targetUsers && !notification.targetUsers.includes(userId)) {
      continue;
    }

    try {
      controller.enqueue(message);
    } catch (error) {
      // Remove dead connections
      connections.delete(userId);
    }
  }
}

// Function to send notification to specific user
export function sendNotificationToUser(userId: string, notification: {
  type: string;
  message: string;
  data?: any;
}) {
  if (!connections) return;

  const controller = connections.get(userId);
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      connections.delete(userId);
    }
  }
}