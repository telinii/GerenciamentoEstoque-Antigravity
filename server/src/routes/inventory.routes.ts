import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  recordStockMovement,
  getInventoryStats
} from '../controllers/product.controller';
import {
  getCategories,
  createCategory,
  deleteCategory
} from '../controllers/category.controller';

const router = Router();

// Todas as rotas de inventário exigem autenticação do usuário
router.use(requireAuth);

// Categorias
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.delete('/categories/:id', deleteCategory);

// Métricas & Dashboard de Estoque
router.get('/stats', getInventoryStats);

// Produtos
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.post('/products/:id/movement', recordStockMovement);

export default router;
