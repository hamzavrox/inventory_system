import { create } from 'zustand'

export const useInventoryStore = create((set, get) => ({
  products: [],
  loading: false,

  fetchProducts: async () => {
    set({ loading: true })
    const data = await window.api.products.getAll()
    set({ products: data, loading: false })
  },

  addProduct: async (data) => {
    const product = await window.api.products.add(data)
    set(s => ({ products: [...s.products, product] }))
  },

  updateProduct: async (id, data) => {
    await window.api.products.update(id, data)
    set(s => ({ products: s.products.map(p => p.id === id ? { ...p, ...data } : p) }))
  },

  deleteProduct: async (id) => {
    await window.api.products.delete(id)
    set(s => ({ products: s.products.filter(p => p.id !== id) }))
  },

  adjustStock: async (payload) => {
    await window.api.inventory.adjustStock(payload)
    get().fetchProducts()
  },
}))


