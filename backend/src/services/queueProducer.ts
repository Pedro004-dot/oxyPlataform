// src/services/queueProducer.ts
// Producer RabbitMQ (comentado para uso futuro)
// import amqp from 'amqplib';
// let channel: amqp.Channel;
// async function init() {
//   const connection = await amqp.connect(process.env.RABBITMQ_URL!);
//   channel = await connection.createChannel();
//   await channel.assertQueue('inbound_messages', { durable: true });
//   await channel.assertQueue('outbound_messages', { durable: true });
// }
// init().catch(console.error);

export const queueProducer = {
    /**
     * Publica dados na fila RabbitMQ (para uso futuro).
     */
    async publish(queue: 'inbound_messages' | 'outbound_messages', data: any) {
      // if (!channel) throw new Error('Queue channel não inicializado');
      // channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
    }
  };
  