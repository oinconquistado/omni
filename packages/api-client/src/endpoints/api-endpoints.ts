export const endpoints = {
  // Auth
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    me: "/auth/me",
  },

  // Companies
  companies: {
    list: "/companies",
    create: "/companies",
    get: (id: string) => `/companies/${id}`,
    update: (id: string) => `/companies/${id}`,
    delete: (id: string) => `/companies/${id}`,
  },

  // Users
  users: {
    list: "/users",
    create: "/users",
    get: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
  },

  // Products
  products: {
    list: "/products",
    create: "/products",
    get: (id: string) => `/products/${id}`,
    update: (id: string) => `/products/${id}`,
    delete: (id: string) => `/products/${id}`,
  },

  // Categories
  categories: {
    list: "/categories",
    create: "/categories",
    get: (id: string) => `/categories/${id}`,
    update: (id: string) => `/categories/${id}`,
    delete: (id: string) => `/categories/${id}`,
  },

  // Inventory
  inventory: {
    list: "/inventory",
    create: "/inventory",
    get: (id: string) => `/inventory/${id}`,
    update: (id: string) => `/inventory/${id}`,
    delete: (id: string) => `/inventory/${id}`,
    adjustStock: (id: string) => `/inventory/${id}/adjust`,
  },
} as const
