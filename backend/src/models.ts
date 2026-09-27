import mongoose, { Schema } from 'mongoose';

const opts = { timestamps: true };
export const Store = mongoose.model('Store', new Schema({
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  phone: String, address: String, isActive: { type: Boolean, default: true },
}, opts));
export const Product = mongoose.model('Product', new Schema({
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  name: { type: String, required: true }, brand: String, category: String,
  aliases: [String], variant: String, unit: String, quantity: Number,
  price: { type: Number, required: true, min: 0 }, stock: { type: Number, required: true, min: 0 },
  isAvailable: { type: Boolean, default: true },
}, opts));
export const Customer = mongoose.model('Customer', new Schema({ name: String, phone: { type: String, unique: true } }, opts));

export const conversationStates = ['IDLE', 'COLLECTING', 'NEEDS_CLARIFICATION', 'AWAITING_CONFIRMATION', 'ORDER_CREATED'] as const;
const pendingSchema = new Schema({
  parsed: Schema.Types.Mixed, status: String, productId: Schema.Types.ObjectId,
  requestedQuantity: Number, options: [Schema.Types.ObjectId], query: String,
}, { _id: false });
export const Conversation = mongoose.model('Conversation', new Schema({
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  state: { type: String, enum: conversationStates, default: 'IDLE' },
  preferredLanguage: { type: String, enum: ['ENGLISH', 'HINGLISH'], default: 'ENGLISH' },
  pendingItems: [pendingSchema], clarificationContext: Schema.Types.Mixed,
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
}, opts));

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, name: String, variant: String,
  requestedQuantity: Number, quantity: Number, unitPrice: Number, subtotal: Number,
}, { _id: false });
export const orderStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const;
export const Order = mongoose.model('Order', new Schema({
  orderNumber: { type: String, required: true, unique: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true }, items: [orderItemSchema],
  subtotal: Number, deliveryFee: { type: Number, default: 0 }, total: Number,
  status: { type: String, enum: orderStatuses, default: 'PENDING', index: true }, customerMessage: String,
}, opts));
