import { Router } from 'express';
import { receiveWhatsAppWebhook, verifyWhatsAppWebhook } from './controller.js';

export const whatsappRouter = Router();
whatsappRouter.get('/webhooks/whatsapp', verifyWhatsAppWebhook);
whatsappRouter.post('/webhooks/whatsapp', receiveWhatsAppWebhook);
