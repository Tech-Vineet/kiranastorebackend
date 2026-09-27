import mongoose from 'mongoose';
import { config } from './config.js';
import { Conversation, Customer, Order, Product, Store } from './models.js';

type Seed = [string, string, string, string[], string, string, number, number, number];
const data: Seed[] = [
 ['Aashirvaad Atta','Aashirvaad','Atta',['atta','aashirvaad atta','aashirwad aata','wheat flour'],'1kg','kg',1,68,20],
 ['Aashirvaad Atta','Aashirvaad','Atta',['atta','aashirvaad atta','aashirwad aata','wheat flour'],'5kg','kg',5,285,15],
 ['Aashirvaad Atta','Aashirvaad','Atta',['atta','aashirvaad atta','aashirwad aata','wheat flour'],'10kg','kg',10,545,8],
 ['India Gate Basmati Rice','India Gate','Rice',['rice','chawal','basmati'],'5kg','kg',5,725,10], ['Fortune Rice','Fortune','Rice',['rice','chawal'],'5kg','kg',5,330,10],
 ['Tata Sampann Toor Dal','Tata','Dal',['dal','toor dal','arhar dal'],'1kg','kg',1,185,15], ['Tata Sampann Moong Dal','Tata','Dal',['dal','moong dal'],'1kg','kg',1,165,15], ['Chana Dal','Local','Dal',['dal','chana dal'],'1kg','kg',1,110,15],
 ['Fortune Mustard Oil','Fortune','Oil',['oil','mustard oil','sarso oil','fortune oil'],'1L','litre',1,175,20], ['Fortune Sunflower Oil','Fortune','Oil',['oil','sunflower oil','fortune oil'],'1L','litre',1,145,20], ['Dhara Mustard Oil','Dhara','Oil',['oil','mustard oil','sarso oil','dhara oil'],'1L','litre',1,168,15],
 ['Amul Taaza Milk','Amul','Milk',['milk','doodh','amul milk'],'500ml','ml',500,29,30], ['Amul Taaza Milk','Amul','Milk',['milk','doodh','amul milk'],'1L','litre',1,57,20], ['Mother Dairy Milk','Mother Dairy','Milk',['milk','doodh','mother dairy milk'],'500ml','ml',500,28,30], ['Mother Dairy Milk','Mother Dairy','Milk',['milk','doodh','mother dairy milk'],'1L','litre',1,56,20],
 ['Britannia White Bread','Britannia','Bread',['bread','white bread','britannia bread'],'400g','packet',1,45,12], ['Harvest Gold Brown Bread','Harvest Gold','Bread',['bread','brown bread'],'400g','packet',1,55,10],
 ['Parle-G','Parle','Biscuits',['parle g','parleg','parle biscuit','biscuit'],'800g','packet',1,75,25], ['Britannia Good Day','Britannia','Biscuits',['good day','biscuit','cookies'],'600g','packet',1,95,15], ['Oreo Original','Cadbury','Biscuits',['oreo','biscuit','cookies'],'120g','packet',1,35,20],
 ['Maggi 2-Minute Noodles','Nestle','Noodles',['maggi','noodles','maggie'],'70g','packet',1,15,50], ['Maggi 2-Minute Noodles','Nestle','Noodles',['maggi','noodles','maggie'],'280g','packet',1,56,25], ['Yippee Noodles','Sunfeast','Noodles',['noodles','yippee'],'280g','packet',1,55,20],
 ['Tata Tea Premium','Tata','Tea',['tea','chai','tata tea'],'500g','packet',1,270,10], ['Red Label Tea','Brooke Bond','Tea',['tea','chai','red label'],'500g','packet',1,285,10], ['Nescafe Classic','Nescafe','Coffee',['coffee','nescafe'],'100g','jar',1,340,8], ['Bru Instant Coffee','Bru','Coffee',['coffee','bru'],'100g','jar',1,260,8],
 ['Madhur Sugar','Madhur','Sugar',['sugar','cheeni','chini'],'1kg','kg',1,52,30], ['Tata Salt','Tata','Salt',['salt','namak','tata salt'],'1kg','kg',1,28,30],
 ['Lux Rose Soap','Lux','Soap',['soap','sabun','lux'],'100g','bar',1,38,20], ['Dove Cream Bar','Dove','Soap',['soap','sabun','dove'],'100g','bar',1,65,20], ['Lifebuoy Soap','Lifebuoy','Soap',['soap','sabun','lifebuoy'],'125g','bar',1,42,20],
 ['Clinic Plus Shampoo','Clinic Plus','Shampoo',['shampoo','clinic plus'],'340ml','bottle',1,235,10], ['Dove Shampoo','Dove','Shampoo',['shampoo','dove shampoo'],'340ml','bottle',1,310,10], ['Sunsilk Shampoo','Sunsilk','Shampoo',['shampoo','sunsilk'],'340ml','bottle',1,265,10],
 ['Surf Excel Easy Wash','Surf Excel','Detergent',['detergent','washing powder','surf excel'],'1kg','kg',1,145,15], ['Ariel Matic','Ariel','Detergent',['detergent','washing powder','ariel'],'1kg','kg',1,250,12], ['Tide Plus','Tide','Detergent',['detergent','washing powder','tide'],'1kg','kg',1,135,12],
 ['Lay’s Classic Salted','Lay’s','Snacks',['chips','lays','namkeen'],'52g','packet',1,20,30], ['Kurkure Masala Munch','Kurkure','Snacks',['kurkure','snacks','namkeen'],'90g','packet',1,20,30], ['Haldiram Bhujia','Haldiram','Snacks',['bhujia','namkeen'],'200g','packet',1,55,20],
 ['Catch Turmeric Powder','Catch','Spices',['haldi','turmeric','masala'],'100g','packet',1,36,15], ['Everest Red Chilli Powder','Everest','Spices',['mirchi','chilli powder','masala'],'100g','packet',1,58,15], ['MDH Garam Masala','MDH','Spices',['garam masala','masala'],'100g','packet',1,88,15],
 ['Amul Butter','Amul','Dairy',['butter','amul butter'],'100g','packet',1,58,15], ['Amul Cheese Slices','Amul','Dairy',['cheese','amul cheese'],'200g','packet',1,145,10], ['Kissan Tomato Ketchup','Kissan','Condiments',['ketchup','sauce','tomato sauce'],'500g','bottle',1,110,10],
 ['Colgate Strong Teeth','Colgate','Personal Care',['toothpaste','colgate'],'200g','tube',1,125,15], ['Pepsodent Toothpaste','Pepsodent','Personal Care',['toothpaste','pepsodent'],'200g','tube',1,110,15], ['Vim Dishwash Bar','Vim','Cleaning',['vim','dishwash','bartan soap'],'200g','bar',1,25,20],
 ['Lizol Floor Cleaner','Lizol','Cleaning',['lizol','floor cleaner'],'1L','bottle',1,210,10], ['Good Knight Refill','Good Knight','Household',['mosquito refill','good knight'],'45ml','refill',1,85,12], ['Saffola Oats','Saffola','Breakfast',['oats','saffola oats'],'500g','packet',1,110,12],
 ['Kellogg’s Corn Flakes','Kellogg’s','Breakfast',['corn flakes','cereal'],'475g','packet',1,210,8], ['Real Mixed Fruit Juice','Real','Beverages',['juice','fruit juice'],'1L','litre',1,115,12], ['Bisleri Water','Bisleri','Beverages',['water','paani','bisleri'],'1L','bottle',1,20,30]
];
await mongoose.connect(config.mongoUri);
await Promise.all([Conversation.deleteMany({}), Order.deleteMany({}), Product.deleteMany({}), Store.deleteMany({}), Customer.deleteMany({})]);
const store = await Store.create({ name: 'Sharma Kirana Store', slug: 'sharma-kirana', phone: '9876543210', address: 'Demo Locality', isActive: true });
await Customer.create({ name: 'Rahul', phone: '9999999999' });
await Product.insertMany(data.map(([name,brand,category,aliases,variant,unit,quantity,price,stock]) => ({ storeId: store._id, name, brand, category, aliases, variant, unit, quantity, price, stock, isAvailable: true })));
console.log(`Seeded ${data.length} products. Store ID: ${store._id}`); await mongoose.disconnect();
