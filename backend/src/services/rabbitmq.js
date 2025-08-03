// backend/src/services/rabbitmq.js
const amqp = require('amqplib');

let channel = null;
let connection = null;
const QUEUE_NAME = 'chat_messages';

async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME);
    console.log('RabbitMQ connected and queue asserted:', QUEUE_NAME);
  } catch (error) {
    console.error('RabbitMQ connection failed:', error.message);
  }
}

async function sendToQueue(message) {
  try {
    if (!channel) return;
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), { persistent: true });
  } catch (error) {
    console.error('Failed to send message to queue:', error.message);
  }
}

module.exports = {
  connectRabbitMQ,
  sendToQueue,
};
