import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import './firebase'; // Inicializa Firebase Admin
import inventoryRoutes from './routes/inventory.routes';
import employeeRoutes from './routes/employee.routes';

const app = express();

// CORS — permite o domínio do Firebase Hosting e localhost para dev
app.use(cors({
  origin: [
    'https://conversor-3a487.web.app',
    'https://conversor-3a487.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
}));

app.use(express.json());

// Rotas
app.use('/inventory', inventoryRoutes);
app.use('/employees', employeeRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Exporta como Cloud Function
export const api = functions.https.onRequest(app);
