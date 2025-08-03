// backend/src/services/consumers/messageLogger.js
const amqp = require('amqplib');

const QUEUE_NAME = 'chat_messages';

async function startConsumer() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME);

    console.log(`Waiting for messages in queue: ${QUEUE_NAME}`);
    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        const content = msg.content.toString();
        console.log('Consumed from queue:', content);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('Consumer error:', error.message);
  }
}

startConsumer();
