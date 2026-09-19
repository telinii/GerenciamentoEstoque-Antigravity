import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';

const productSchema = z.object({
  sku: z.string().min(1, 'O código/SKU é obrigatório').max(50, 'SKU muito longo'),
  name: z.string().min(1, 'O nome do produto é obrigatório').max(150, 'Nome muito longo'),
  description: z.string().optional().nullable(),
  price: z.number().min(0, 'O preço de venda não pode ser negativo').default(0),
  costPrice: z.number().min(0, 'O preço de custo não pode ser negativo').default(0),
  quantity: z.number().int().min(0, 'A quantidade não pode ser negativa').default(0),
  minQuantity: z.number().int().min(0, 'A quantidade mínima não pode ser negativa').default(5),
  unit: z.string().default('UN'),
  location: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable()
});

const updateProductSchema = productSchema.partial();

const movementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'LOSS']),
  quantity: z.number().int().min(1, 'A quantidade movimentada deve ser maior que zero'),
  reason: z.string().optional().nullable()
});

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      search,
      categoryId,
      status, // 'all', 'low_stock', 'out_of_stock', 'in_stock'
      sortBy = 'updatedAt',
      order = 'desc'
    } = req.query as Record<string, string>;

    const where: any = { userId };

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { name: { contains: term } },
        { sku: { contains: term } },
        { description: { contains: term } },
        { location: { contains: term } }
      ];
    }

    let products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, color: true }
        }
      },
      orderBy: {
        [sortBy === 'category' ? 'name' : sortBy]: order === 'asc' ? 'asc' : 'desc'
      }
    });

    // In SQLite, filtering dynamic comparison (quantity <= minQuantity) can be done in memory
    if (status === 'low_stock') {
      products = products.filter((p) => p.quantity > 0 && p.quantity <= p.minQuantity);
    } else if (status === 'out_of_stock') {
      products = products.filter((p) => p.quantity === 0);
    } else if (status === 'in_stock') {
      products = products.filter((p) => p.quantity > p.minQuantity);
    }

    return res.json({ products });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, userId },
      include: {
        category: true,
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 30
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar detalhes do produto' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = productSchema.parse(req.body);

    const existingSku = await prisma.product.findFirst({
      where: { userId, sku: data.sku.trim() }
    });

    if (existingSku) {
      return res.status(400).json({ error: `O SKU/Código "${data.sku}" já está em uso.` });
    }

    // Valida categoria se informada
    if (data.categoryId) {
      const catExists = await prisma.category.findFirst({
        where: { id: data.categoryId, userId }
      });
      if (!catExists) {
        return res.status(400).json({ error: 'Categoria inválida ou não pertence ao usuário.' });
      }
    }

    const product = await prisma.product.create({
      data: {
        userId,
        sku: data.sku.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price: data.price,
        costPrice: data.costPrice,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        unit: data.unit.trim().toUpperCase() || 'UN',
        location: data.location?.trim() || null,
        categoryId: data.categoryId || null
      },
      include: {
        category: true
      }
    });

    // Se iniciou com estoque > 0, cria movimentação inicial
    if (data.quantity > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          userId,
          type: 'IN',
          quantity: data.quantity,
          previousQuantity: 0,
          newQuantity: data.quantity,
          reason: 'Saldo Inicial de Cadastro'
        }
      });
    }

    return res.status(201).json({ message: 'Produto cadastrado com sucesso', product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao criar produto' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateProductSchema.parse(req.body);

    const existingProduct = await prisma.product.findFirst({
      where: { id, userId }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    if (data.sku && data.sku.trim().toUpperCase() !== existingProduct.sku) {
      const duplicateSku = await prisma.product.findFirst({
        where: { userId, sku: data.sku.trim().toUpperCase(), id: { not: id } }
      });
      if (duplicateSku) {
        return res.status(400).json({ error: `O SKU "${data.sku}" já está em uso por outro produto.` });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(data.sku ? { sku: data.sku.trim().toUpperCase() } : {}),
        ...(data.name ? { name: data.name.trim() } : {}),
        description: data.description !== undefined ? (data.description?.trim() || null) : undefined,
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.costPrice !== undefined ? { costPrice: data.costPrice } : {}),
        ...(data.minQuantity !== undefined ? { minQuantity: data.minQuantity } : {}),
        ...(data.unit ? { unit: data.unit.trim().toUpperCase() } : {}),
        location: data.location !== undefined ? (data.location?.trim() || null) : undefined,
        categoryId: data.categoryId !== undefined ? (data.categoryId || null) : undefined
      },
      include: {
        category: true
      }
    });

    return res.json({ message: 'Produto atualizado com sucesso', product: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, userId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    await prisma.product.delete({
      where: { id }
    });

    return res.json({ message: 'Produto excluído com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir produto' });
  }
};

export const recordStockMovement = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { type, quantity, reason } = movementSchema.parse(req.body);

    const product = await prisma.product.findFirst({
      where: { id, userId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    let newQuantity = product.quantity;
    const prevQuantity = product.quantity;

    if (type === 'IN') {
      newQuantity = prevQuantity + quantity;
    } else if (type === 'OUT' || type === 'LOSS') {
      if (prevQuantity < quantity) {
        return res.status(400).json({
          error: `Saldo insuficiente em estoque. Disponível: ${prevQuantity} ${product.unit}, Solicitado: ${quantity} ${product.unit}`
        });
      }
      newQuantity = prevQuantity - quantity;
    } else if (type === 'ADJUSTMENT') {
      newQuantity = quantity; // No ajuste, a quantidade informada é o novo saldo absoluto
    }

    // Executa atomicamente
    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId: id,
          userId,
          type,
          quantity: type === 'ADJUSTMENT' ? Math.abs(newQuantity - prevQuantity) : quantity,
          previousQuantity: prevQuantity,
          newQuantity,
          reason: reason?.trim() || null
        }
      }),
      prisma.product.update({
        where: { id },
        data: { quantity: newQuantity },
        include: { category: true }
      })
    ]);

    return res.json({
      message: 'Movimentação registrada com sucesso',
      movement,
      product: updatedProduct
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao registrar movimentação de estoque' });
  }
};

export const getInventoryStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const products = await prisma.product.findMany({
      where: { userId },
      select: {
        id: true,
        price: true,
        costPrice: true,
        quantity: true,
        minQuantity: true
      }
    });

    const totalProducts = products.length;
    let totalItemsInStock = 0;
    let totalStockValueCost = 0;
    let totalStockValueSale = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      totalItemsInStock += p.quantity;
      totalStockValueCost += (p.costPrice || 0) * p.quantity;
      totalStockValueSale += (p.price || 0) * p.quantity;

      if (p.quantity === 0) {
        outOfStockCount++;
      } else if (p.quantity <= p.minQuantity) {
        lowStockCount++;
      }
    }

    const recentMovements = await prisma.stockMovement.findMany({
      where: { userId },
      include: {
        product: {
          select: { id: true, name: true, sku: true, unit: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    return res.json({
      stats: {
        totalProducts,
        totalItemsInStock,
        totalStockValueCost,
        totalStockValueSale,
        lowStockCount,
        outOfStockCount
      },
      recentMovements
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao carregar estatísticas do inventário' });
  }
};
