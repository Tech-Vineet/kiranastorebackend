import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kirana_mvp',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',').map(value => value.trim()).filter(Boolean),
  llmProvider: process.env.LLM_PROVIDER || 'local',
  llmApiKey: process.env.LLM_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  metaVerifyToken: process.env.META_VERIFY_TOKEN || '',
  metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
  metaWabaId: process.env.META_WABA_ID || '',
  metaAccessToken: process.env.META_ACCESS_TOKEN || '',
  metaGraphApiVersion: process.env.META_GRAPH_API_VERSION || '',
};
