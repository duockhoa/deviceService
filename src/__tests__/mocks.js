// Mock database connections for tests
const mockSequelize = {
  authenticate: jest.fn().mockResolvedValue(),
  sync: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue(),
  define: jest.fn((name, attributes) => ({
    name,
    attributes,
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    hasOne: jest.fn(),
    belongsToMany: jest.fn()
  }))
};

jest.mock('../configs/sequelize', () => mockSequelize);

// Mock mysql2 to avoid encoding issues
jest.mock('mysql2', () => ({
  createConnection: jest.fn(),
  createPool: jest.fn()
}));
