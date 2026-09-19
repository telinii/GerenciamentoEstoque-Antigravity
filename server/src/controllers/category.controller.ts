import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';

const categorySchema = z.object({
  name: z.string().min(1, 'O nome da categoria é obrigatório').max(50, 'Nome muito longo'),
  description: z.string().optional().nullable(),
  color: z.string().optional().default('#3b82f6')
});

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({ categories });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, description, color } = categorySchema.parse(req.body);

    const existing = await prisma.category.findFirst({
      where: { userId, name: { equals: name.trim() } }
    });

    if (existing) {
      return res.status(400).json({ error: 'Já existe uma categoria com este nome.' });
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3b82f6'
      }
    });

    return res.status(201).json({ message: 'Categoria criada com sucesso', category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao criar categoria' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const category = await prisma.category.findFirst({
      where: { id, userId }
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    await prisma.category.delete({
      where: { id }
    });

    return res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
};
