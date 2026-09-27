import { Conversation, Customer, Order, Product, Store } from './models.js';
import { parseShoppingImage, parseShoppingMessage, type ParsedItem } from './parser.js';
import { resolveProduct } from './resolver.js';
import { AppError } from './errors.js';

const viewProduct = (p: any) => ({ id: String(p._id), name: p.name, brand: p.brand, variant: p.variant, price: p.price, stock: p.stock });
const hinglishWords = /\b(bhai|mujhe|chahiye|chaiye|bhej|dena|do|aur|ek|doodh|aata|atta|tel|namak|cheeni|chini|chawal|sabun|paani)\b/i;
const languageOf = (message: string) => hinglishWords.test(message) ? 'HINGLISH' : 'ENGLISH';
const say = (conversation: any, english: string, hinglish: string) => conversation.preferredLanguage === 'HINGLISH' ? hinglish : english;
const greetingOnly = /^\s*(hi+|hello+|hey+|hlo+|namaste|namaskar|good\s+(morning|afternoon|evening))[!.?\s]*$/i;
async function summary(conversation: any) {
  const resolved = conversation.pendingItems.filter((i: any) => i.status === 'RESOLVED');
  const products = await Product.find({ _id: { $in: resolved.map((i: any) => i.productId) } });
  const items = resolved.map((item: any) => {
    const product: any = products.find(p => String(p._id) === String(item.productId));
    if (!product) throw new AppError(409, 'A selected product is no longer available');
    const quantity = item.requestedQuantity || 1;
    return { productId: String(product._id), name: product.name, variant: product.variant, quantity, unitPrice: product.price, subtotal: product.price * quantity };
  });
  const subtotal = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);
  return { items, subtotal, deliveryFee: 0, total: subtotal };
}
function responseFor(conversation: any, extra: Record<string, unknown> = {}) {
  return { sessionId: conversation.sessionId, state: conversation.state, language: conversation.preferredLanguage, ...extra };
}
type ChatInput = { sessionId: string; storeId: string; customerName?: string; customerPhone?: string; message: string };
async function processParsed(input: ChatInput, parsed: { items: ParsedItem[] }, detectedLanguage?: 'ENGLISH' | 'HINGLISH') {
  const store = await Store.findOne({ _id: input.storeId, isActive: true });
  if (!store) throw new AppError(404, 'Store not found');
  const customer = await Customer.findOneAndUpdate({ phone: input.customerPhone || '9999999999' }, { $set: { name: input.customerName || 'Rahul' } }, { upsert: true, new: true });
  let conversation: any = await Conversation.findOne({ sessionId: input.sessionId });
  if (conversation && String(conversation.storeId) !== input.storeId) throw new AppError(403, 'Session does not belong to this store');
  if (!conversation) conversation = await Conversation.create({ storeId: store._id, customerId: customer._id, sessionId: input.sessionId, state: 'IDLE', pendingItems: [] });
  conversation.preferredLanguage = detectedLanguage || languageOf(input.message);
  if (conversation.state === 'NEEDS_CLARIFICATION') throw new AppError(409, 'Please choose one of the available options');
  if (conversation.state === 'AWAITING_CONFIRMATION') throw new AppError(409, 'Please confirm this order or start a new session');
  const products: any[] = await Product.find({ storeId: store._id });
  conversation.pendingItems = parsed.items.map(item => {
    const result = resolveProduct(products, item);
    return { parsed: item, query: item.productQuery, status: result.status, requestedQuantity: item.unit ? 1 : item.quantity, productId: result.product?._id, options: result.options.map(p => p._id) };
  });
  const ambiguous = conversation.pendingItems.find((i: any) => i.status === 'AMBIGUOUS');
  const missing = conversation.pendingItems.filter((i: any) => i.status === 'NOT_FOUND').map((i: any) => i.query);
  if (ambiguous) {
    conversation.state = 'NEEDS_CLARIFICATION'; conversation.clarificationContext = { query: ambiguous.query };
    await conversation.save();
    const options = await Product.find({ _id: { $in: ambiguous.options } });
    return responseFor(conversation, { message: say(conversation, `Which ${ambiguous.query} would you like?`, `Aap kaunsa ${ambiguous.query} lena chahenge?`), options: options.map(viewProduct), unavailable: missing });
  }
  conversation.state = 'AWAITING_CONFIRMATION'; await conversation.save();
  return responseFor(conversation, { message: missing.length ? say(conversation, `${missing.join(', ')} is currently unavailable. Here are the remaining items.`, `${missing.join(', ')} abhi available nahi hai. Baaki items ka order yeh raha.`) : say(conversation, "Here's your order.", 'Aapka order yeh raha.'), summary: await summary(conversation), unavailable: missing });
}
export async function receiveMessage(input: ChatInput) {
  if (greetingOnly.test(input.message)) {
    const store = await Store.findOne({ _id: input.storeId, isActive: true });
    if (!store) throw new AppError(404, 'Store not found');
    const customer = await Customer.findOneAndUpdate({ phone: input.customerPhone || '9999999999' }, { $set: { name: input.customerName || 'Rahul' } }, { upsert: true, new: true });
    let conversation: any = await Conversation.findOne({ sessionId: input.sessionId });
    if (conversation && String(conversation.storeId) !== input.storeId) throw new AppError(403, 'Session does not belong to this store');
    if (!conversation) conversation = await Conversation.create({ storeId: store._id, customerId: customer._id, sessionId: input.sessionId, state: 'IDLE', preferredLanguage: 'HINGLISH', pendingItems: [] });
    conversation.preferredLanguage = 'HINGLISH'; await conversation.save();
    return responseFor(conversation, { message: `Namaste! Aap ${store.name} se jude hain. Apni grocery list bhejiye—main aapka order taiyar karne mein madad karunga.` });
  }
  return processParsed(input, await parseShoppingMessage(input.message));
}
export async function receiveImage(input: Omit<ChatInput, 'message'> & { imageDataUrl: string }) {
  const result = await parseShoppingImage(input.imageDataUrl);
  return processParsed({ ...input, message: '[Shopping list photo]' }, result.parsed, result.language);
}
export async function clarify(sessionId: string, productId: string) {
  const conversation: any = await Conversation.findOne({ sessionId });
  if (!conversation || conversation.state !== 'NEEDS_CLARIFICATION') throw new AppError(409, 'No clarification is pending');
  const item = conversation.pendingItems.find((i: any) => i.status === 'AMBIGUOUS');
  if (!item || !item.options.some((id: any) => String(id) === productId)) throw new AppError(400, 'That product is not one of the available options');
  const product: any = await Product.findOne({ _id: productId, storeId: conversation.storeId, isAvailable: true });
  if (!product) throw new AppError(409, 'Product is no longer available');
  item.productId = product._id; item.status = 'RESOLVED'; item.options = [];
  const next = conversation.pendingItems.find((i: any) => i.status === 'AMBIGUOUS');
  if (next) {
    conversation.clarificationContext = { query: next.query }; await conversation.save();
    const options = await Product.find({ _id: { $in: next.options } });
    return responseFor(conversation, { message: say(conversation, `Which ${next.query} would you like?`, `Aap kaunsa ${next.query} lena chahenge?`), options: options.map(viewProduct) });
  }
  conversation.state = 'AWAITING_CONFIRMATION'; conversation.clarificationContext = null; await conversation.save();
  return responseFor(conversation, { message: say(conversation, "Here's your order.", 'Aapka order yeh raha.'), summary: await summary(conversation) });
}
export async function confirm(sessionId: string) {
  const conversation: any = await Conversation.findOne({ sessionId });
  if (!conversation || conversation.state !== 'AWAITING_CONFIRMATION') throw new AppError(409, 'Order is not ready to confirm');
  const cart = await summary(conversation);
  if (!cart.items.length) throw new AppError(400, 'No available products to order');
  for (const item of cart.items) {
    const product = await Product.findOne({ _id: item.productId, storeId: conversation.storeId, isAvailable: true, stock: { $gte: item.quantity } });
    if (!product) throw new AppError(409, `${item.name} no longer has enough stock`);
  }
  const count = await Order.countDocuments(); const orderNumber = `ORD-${1042 + count}`;
  const order = await Order.create({ ...cart, orderNumber, storeId: conversation.storeId, customerId: conversation.customerId, status: 'PENDING' });
  conversation.state = 'ORDER_CREATED'; conversation.orderId = order._id; await conversation.save();
  return { order: await Order.findById(order._id).populate('customerId', 'name phone'), sessionId };
}
export async function changeStatus(orderId: string, status: 'ACCEPTED' | 'REJECTED') {
  const order: any = await Order.findById(orderId);
  if (!order) throw new AppError(404, 'Order not found');
  if (order.status !== 'PENDING') throw new AppError(409, 'Only pending orders can be changed');
  if (status === 'ACCEPTED') {
    const decremented: any[] = [];
    try {
      for (const item of order.items) {
        const updated = await Product.findOneAndUpdate({ _id: item.productId, storeId: order.storeId, isAvailable: true, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { new: true });
        if (!updated) throw new AppError(409, `Insufficient stock for ${item.name}`);
        decremented.push(item);
      }
      order.status = 'ACCEPTED'; await order.save();
    } catch (error) {
      await Promise.all(decremented.map(item => Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } })));
      throw error;
    }
  } else { order.status = 'REJECTED'; await order.save(); }
  return Order.findById(orderId).populate('customerId', 'name phone');
}
