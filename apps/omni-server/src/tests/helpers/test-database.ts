import { dbManager } from '../../services/database-clients.js'

export const cleanupTestDatabase = async () => {
  try {
    const companyDb = dbManager.getCompanyClient()
    const sharedDb = dbManager.getSharedClient()

    await companyDb.session.deleteMany()
    await companyDb.client.deleteMany()
    await companyDb.user.deleteMany()

    await sharedDb.clientSession.deleteMany()
    await sharedDb.stock.deleteMany()
    await sharedDb.product.deleteMany()
    await sharedDb.category.deleteMany()
    await sharedDb.clientUser.deleteMany()
  } catch (error) {
    console.error('Failed to cleanup test database:', error)
  }
}

export const setupTestTenant = async (tenantId: string) => {
  const companyDb = dbManager.getCompanyClient()
  
  const client = await companyDb.client.create({
    data: {
      tenantId,
      companyName: `Test Company ${tenantId}`,
      contactEmail: `contact@${tenantId}.com`,
      status: 'TRIAL'
    }
  })
  
  return client
}

export const createTestUser = async (userData: {
  email: string
  name: string
  role?: 'ADMIN' | 'SUPPORT'
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
}) => {
  const companyDb = dbManager.getCompanyClient()
  
  return await companyDb.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      role: userData.role || 'SUPPORT',
      status: userData.status || 'ACTIVE'
    }
  })
}

export const createTestClientUser = async (clientUserData: {
  tenantId: string
  email: string
  name: string
  role?: 'ADMIN' | 'SALESPERSON'
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
}) => {
  const sharedDb = dbManager.getSharedClient()
  
  return await sharedDb.clientUser.create({
    data: {
      tenantId: clientUserData.tenantId,
      email: clientUserData.email,
      name: clientUserData.name,
      role: clientUserData.role || 'SALESPERSON',
      status: clientUserData.status || 'ACTIVE'
    }
  })
}

export const createTestProduct = async (productData: {
  tenantId: string
  sku: string
  name: string
  description?: string
  price: string
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'
}) => {
  const sharedDb = dbManager.getSharedClient()
  
  return await sharedDb.product.create({
    data: {
      tenantId: productData.tenantId,
      sku: productData.sku,
      name: productData.name,
      description: productData.description,
      price: productData.price,
      status: productData.status || 'ACTIVE'
    }
  })
}