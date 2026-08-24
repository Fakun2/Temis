import amqp, { type Channel, type ChannelModel } from "amqplib";
import { getEnv, getPositiveNumberEnv } from "../config";
import { createLogger } from "../logger";
import {
  documentCleanupQueueName,
  documentCleanupRoutingKey,
  notificationQueueName,
  notificationReminderRoutingKey,
  rabbitExchangeName
} from "./constants";
import type { QueuePayload } from "./types";

type MessageHandler<TPayload extends QueuePayload> = (payload: TPayload) => Promise<void>;
type DisconnectListener = () => void;
type DisconnectWaiter = {
  dispose: () => void;
  promise: Promise<void>;
};

export class RabbitMq {
  private readonly logger = createLogger("RabbitMQ");
  private channel: Channel | null = null;
  private closed = false;
  private connection: ChannelModel | null = null;
  private connecting: Promise<Channel> | null = null;
  private readonly disconnectListeners = new Set<DisconnectListener>();

  async close() {
    this.closed = true;
    this.disconnectListeners.clear();
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
    this.connecting = null;
  }

  waitForDisconnect(): DisconnectWaiter {
    let listener: DisconnectListener = () => undefined;
    const promise = new Promise<void>((resolve) => {
      listener = resolve;
      this.disconnectListeners.add(listener);
    });

    return {
      dispose: () => this.disconnectListeners.delete(listener),
      promise
    };
  }

  async publishDelayed(routingKey: string, payload: QueuePayload, delayMs = 0) {
    const channel = await this.getChannel();
    const body = Buffer.from(JSON.stringify(payload));
    const published = channel.publish(rabbitExchangeName, routingKey, body, {
      contentType: "application/json",
      deliveryMode: 2,
      headers: delayMs > 0 ? { "x-delay": delayMs } : undefined
    });

    if (!published) {
      await new Promise<void>((resolve) => channel.once("drain", resolve));
    }
  }

  async consume<TPayload extends QueuePayload>(
    queueName: string,
    routingKey: string,
    handler: MessageHandler<TPayload>
  ) {
    const channel = await this.getChannel();
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, rabbitExchangeName, routingKey);
    await channel.prefetch(getPositiveNumberEnv("RABBITMQ_PREFETCH", 3));
    await channel.consume(queueName, async (message) => {
      if (!message) {
        return;
      }

      try {
        const payload = JSON.parse(message.content.toString("utf8")) as TPayload;
        await handler(payload);
        channel.ack(message);
      } catch (error) {
        this.logger.error(`Handler failed for ${routingKey}.`, error);
        channel.nack(message, false, false);
      }
    });
  }

  async bindDefaultQueues() {
    const channel = await this.getChannel();
    await channel.assertQueue(notificationQueueName, { durable: true });
    await channel.assertQueue(documentCleanupQueueName, { durable: true });
    await channel.bindQueue(notificationQueueName, rabbitExchangeName, notificationReminderRoutingKey);
    await channel.bindQueue(documentCleanupQueueName, rabbitExchangeName, documentCleanupRoutingKey);
  }

  private async getChannel() {
    if (this.channel) {
      return this.channel;
    }

    if (!this.connecting) {
      this.connecting = this.connect();
    }

    try {
      this.channel = await this.connecting;
      return this.channel;
    } finally {
      this.connecting = null;
    }
  }

  private async connect() {
    this.closed = false;
    const url = getEnv("RABBITMQ_URL", "amqp://localhost:5672");
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();

    connection.on("close", () => this.resetConnection("RabbitMQ connection closed."));
    connection.on("error", (error) => this.resetConnection("RabbitMQ connection failed.", error));
    channel.on("close", () => this.resetConnection("RabbitMQ channel closed."));
    channel.on("error", (error) => this.resetConnection("RabbitMQ channel failed.", error));

    await channel.assertExchange(rabbitExchangeName, "x-delayed-message", {
      durable: true,
      arguments: { "x-delayed-type": "direct" }
    });

    this.connection = connection;
    this.logger.info(`Connected to exchange ${rabbitExchangeName}.`);
    return channel;
  }

  private resetConnection(message: string, error?: unknown) {
    const channel = this.channel;
    const connection = this.connection;
    const connecting = this.connecting;

    this.channel = null;
    this.connection = null;
    this.connecting = null;

    if (this.closed) {
      return;
    }

    if (!channel && !connection && !connecting) {
      return;
    }

    if (error) {
      this.logger.error(message, error);
    } else {
      this.logger.warn(message);
    }

    void channel?.close().catch(() => undefined);
    void connection?.close().catch(() => undefined);

    if (!this.closed) {
      for (const listener of [...this.disconnectListeners]) {
        listener();
      }
    }
  }
}
