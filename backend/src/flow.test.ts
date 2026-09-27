import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose'; import { MongoMemoryServer } from 'mongodb-memory-server';
import { Conversation, Customer, Order, Product, Store } from './models.js'; import { changeStatus, clarify, confirm, receiveMessage } from './services.js';
import { config } from './config.js';
let mongo: MongoMemoryServer;
describe('required order flow', () => {
 beforeAll(async()=>{config.llmProvider='local';mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());});
 afterAll(async()=>{await mongoose.disconnect();await mongo.stop();});
 it('clarifies oil, creates priced order, accepts, and decrements stock',async()=>{
  const store=await Store.create({name:'Sharma Kirana Store',slug:'sharma-kirana',isActive:true}); await Customer.create({name:'Rahul',phone:'9999999999'});
  await Product.insertMany([
   {storeId:store._id,name:'Aashirvaad Atta',brand:'Aashirvaad',category:'Atta',aliases:['atta','aashirvaad atta'],variant:'5kg',unit:'kg',quantity:5,price:285,stock:10,isAvailable:true},
   {storeId:store._id,name:'Parle-G',brand:'Parle',category:'Biscuits',aliases:['parle g','parleg'],variant:'800g',unit:'packet',quantity:1,price:75,stock:10,isAvailable:true},
   {storeId:store._id,name:'Fortune Mustard Oil',brand:'Fortune',category:'Oil',aliases:['oil','mustard oil'],variant:'1L',unit:'litre',quantity:1,price:175,stock:10,isAvailable:true},
   {storeId:store._id,name:'Fortune Sunflower Oil',brand:'Fortune',category:'Oil',aliases:['oil','sunflower oil'],variant:'1L',unit:'litre',quantity:1,price:145,stock:10,isAvailable:true},
  ]);
  const first:any=await receiveMessage({sessionId:'required-flow',storeId:String(store._id),message:'bhai 5kg aashirvaad atta, 2 parle g aur 1 litre oil bhej do'}); expect(first.state).toBe('NEEDS_CLARIFICATION'); expect(first.language).toBe('HINGLISH'); expect(first.message).toContain('kaunsa'); expect(first.options).toHaveLength(2); const pending:any=await Conversation.findOne({sessionId:'required-flow'}); expect(pending.pendingItems.map((x:any)=>[x.query,x.requestedQuantity])).toEqual([['aashirvaad atta',1],['parle g',2],['oil',1]]);
  const mustard=first.options.find((x:any)=>x.name.includes('Mustard')); const resolved:any=await clarify('required-flow',mustard.id); expect(resolved.state).toBe('AWAITING_CONFIRMATION'); expect(resolved.message).toBe('Aapka order yeh raha.'); expect(resolved.summary.items.find((x:any)=>x.name==='Parle-G').quantity).toBe(2); expect(resolved.summary.total).toBe(610);
  const created:any=await confirm('required-flow'); expect(created.order.status).toBe('PENDING'); expect(created.order.orderNumber).toBe('ORD-1042');
  const accepted:any=await changeStatus(String(created.order._id),'ACCEPTED'); expect(accepted?.status).toBe('ACCEPTED'); expect((await Product.findById(mustard.id))?.stock).toBe(9);
  expect((await Conversation.findOne({sessionId:'required-flow'}))?.state).toBe('ORDER_CREATED'); expect(await Order.countDocuments()).toBe(1);
 },30000);
 it('greets the customer without parsing an empty shopping order', async()=>{
  const store=await Store.findOne({slug:'sharma-kirana'});
  const result:any=await receiveMessage({sessionId:'greeting-flow',storeId:String(store!._id),message:'hii'});
  expect(result.state).toBe('IDLE'); expect(result.language).toBe('HINGLISH'); expect(result.message).toContain('Sharma Kirana Store'); expect(result.message).toContain('grocery list');
 });
});
