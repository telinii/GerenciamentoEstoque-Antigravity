import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FirebaseProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  quantity: number;
  minQuantity: number;
  category?: string;
  location?: string;
  description?: string;
  updatedAt?: any;
}

export interface FirebaseUser {
  uid: string;
  email: string;
  name: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'OWNER';
  createdAt?: any;
}

// ============================================================================
// Produtos (Firestore)
// ============================================================================
export const firebaseProductService = {
  // Obter todos os produtos
  async getAll(): Promise<FirebaseProduct[]> {
    const querySnapshot = await getDocs(collection(db, 'products'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseProduct));
  },

  // Escutar produtos em tempo real
  subscribeToProducts(callback: (products: FirebaseProduct[]) => void) {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseProduct));
      callback(items);
    });
  },

  // Adicionar produto (Requer ADMIN)
  async create(product: Omit<FirebaseProduct, 'id'>): Promise<string> {
    const newDocRef = doc(collection(db, 'products'));
    await setDoc(newDocRef, {
      ...product,
      updatedAt: serverTimestamp()
    });
    return newDocRef.id;
  },

  // Atualização total (ADMIN)
  async updateFull(id: string, data: Partial<FirebaseProduct>): Promise<void> {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // Edição fraca (USER NORMAL: apenas quantidade e/ou descrição)
  async updateWeak(id: string, data: { quantity?: number; description?: string }): Promise<void> {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // Exclusão (Requer ADMIN)
  async delete(id: string): Promise<void> {
    const productRef = doc(db, 'products', id);
    await deleteDoc(productRef);
  }
};

// ============================================================================
// Usuários & Perfis (Firestore)
// ============================================================================
export const firebaseUserService = {
  async getProfile(uid: string): Promise<FirebaseUser | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as FirebaseUser;
    }
    return null;
  },

  async setProfile(uid: string, data: Partial<FirebaseUser>): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
};
